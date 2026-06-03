import { Request, Response, NextFunction } from "express";
import { ConnectInstagramSchema } from "./instagram.schema";
import { InstagramService } from "../../services/instagram/instagram.service";
import { InstagramOAuth } from "../../services/instagram/instagram.oauth";
import { prisma } from "../../config/db";
import { InstagramAnalytics } from "../../services/instagram/instagram.analytics";
import { OpenAIService } from "../../services/openai/openai.service";

export class InstagramController {
  static async connect(req: Request, res: Response, next: NextFunction) {
    try {
      const { accessToken: incomingToken } = ConnectInstagramSchema.parse(req.body);
      const userId = req.user!.id;

      let accessToken = incomingToken;
      let expiresAt: Date | null = null;
      let tokenType: string | null = null;

      const clientSecret = process.env.META_CLIENT_SECRET;
      
      if (clientSecret && !incomingToken.startsWith("mock") && !incomingToken.startsWith("mock-")) {
        try {
          const longLivedRes = await InstagramOAuth.exchangeForLongLivedToken(clientSecret, incomingToken);
          accessToken = longLivedRes.accessToken;
          expiresAt = new Date(Date.now() + longLivedRes.expiresIn * 1000);
          tokenType = "LONG_LIVED";
        } catch (err: any) {
          console.error(`[Instagram Connect] Failed to exchange for long-lived token: ${err.message}`);
          expiresAt = new Date(Date.now() + 3600 * 1000);
          tokenType = "SHORT_LIVED";
        }
      } else if (incomingToken.startsWith("mock") || incomingToken.startsWith("mock-")) {
        expiresAt = new Date(Date.now() + 5183944 * 1000);
        tokenType = "LONG_LIVED";
      }

      const profile = await InstagramService.getInstagramProfile(accessToken);

      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          instagramUserId: profile.id,
          instagramUsername: profile.username,
          instagramAccessToken: accessToken,
          instagramConnectedAt: new Date(),
          instagramTokenExpiresAt: expiresAt,
          instagramTokenType: tokenType,
        },
      });

      return res.status(200).json({
        success: true,
        instagramUsername: user.instagramUsername,
        instagramConnectedAt: user.instagramConnectedAt,
      });
    } catch (err) {
      next(err);
    }
  }

  static async getProfile(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.instagramAccessToken) {
        return res.status(404).json({ error: "Instagram account not connected" });
      }

      const profile = await InstagramService.getInstagramProfile(user.instagramAccessToken);
      return res.status(200).json(profile);
    } catch (err) {
      next(err);
    }
  }

  static async getMedia(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.instagramAccessToken) {
        return res.status(404).json({ error: "Instagram account not connected" });
      }

      console.log(`[Instagram Debug] step=controller.getMedia.start userId=${userId} instagramUserId=${user.instagramUserId} endpoint=GET /api/instagram/media status=processing`);

      const media = await InstagramService.getInstagramMedia(user.instagramAccessToken);
      
      console.log(`[Instagram Debug] step=controller.getMedia.success userId=${userId} instagramUserId=${user.instagramUserId} endpoint=GET /api/instagram/media status=success mediaCount=${media.data?.length}`);
      
      return res.status(200).json(media);
    } catch (err: any) {
      const userId = req.user?.id;
      console.error(`[Instagram Debug] step=controller.getMedia.error userId=${userId} endpoint=GET /api/instagram/media status=error error=${err.message} stack=${err.stack}`);
      next(err);
    }
  }

  static async disconnect(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      await prisma.user.update({
        where: { id: userId },
        data: {
          instagramUserId: null,
          instagramUsername: null,
          instagramAccessToken: null,
          instagramConnectedAt: null,
        },
      });

      return res.status(200).json({ success: true });
    } catch (err) {
      next(err);
    }
  }

  static async sync(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user || !user.instagramAccessToken) {
        return res.status(404).json({ error: "Instagram account not connected" });
      }

      console.log(`[Instagram Debug] step=controller.sync.start userId=${userId} instagramUserId=${user.instagramUserId} endpoint=POST /api/instagram/sync status=processing`);

      const result = await InstagramService.refreshProfileData(userId);

      console.log(`[Instagram Debug] step=controller.sync.success userId=${userId} instagramUserId=${user.instagramUserId} endpoint=POST /api/instagram/sync status=success`);

      return res.status(200).json(result);
    } catch (err: any) {
      const userId = req.user?.id;
      console.error(`[Instagram Debug] step=controller.sync.error userId=${userId} endpoint=POST /api/instagram/sync status=error error=${err.message} stack=${err.stack}`);
      next(err);
    }
  }

  static async getIntelligence(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;

      // Check if user has an Instagram connection
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });
      if (!user || !user.instagramAccessToken) {
        return res.status(404).json({ error: "Instagram account not connected" });
      }

      // Retrieve latest cache snapshot
      const latestSnapshot = await prisma.instagramSnapshot.findFirst({
        where: { userId },
        orderBy: { createdAt: "desc" },
      });

      if (!latestSnapshot) {
        return res.status(404).json({ error: "No Instagram snapshot found. Run sync first." });
      }

      const profile = JSON.parse(latestSnapshot.profileJson);
      const media = JSON.parse(latestSnapshot.mediaJson);
      const analytics = JSON.parse(latestSnapshot.analyticsJson);

      // Run AI enrichment on top of deterministic metrics
      const aiResult = await OpenAIService.analyzeInstagramContent(profile, media, analytics, userId);

      return res.status(200).json({
        creatorHealthScore: analytics.creatorHealthScore,
        postingCadence: analytics.postingCadence,
        contentDistribution: analytics.contentDistribution,
        consistencyScore: analytics.consistencyScore,
        hookAnalysis: {
          strongestHooks: analytics.hookAnalysis.strongestHooks,
          weakestHooks: analytics.hookAnalysis.weakestHooks,
          suggestedHooks: aiResult.hookSuggestions || aiResult.suggestedNewHooks || [],
        },
        contentPillars: analytics.contentPillars,
        opportunities: [
          ...analytics.opportunities,
          ...(aiResult.opportunities || []),
        ],
        aiRecommendations: aiResult.recommendations || [],
        contentIdeas: aiResult.ideas || { reels: [], carousels: [], stories: [] },
      });
    } catch (err) {
      next(err);
    }
  }

  static async startOAuth(req: Request, res: Response, next: NextFunction) {
    try {
      const { state } = req.query;
      const userId = req.user!.id;

      if (!state || typeof state !== "string") {
        return res.status(400).json({ error: "State parameter is required" });
      }

      // Store oauthState server-side on the User model
      await prisma.user.update({
        where: { id: userId },
        data: { instagramOAuthState: state },
      });

      const clientId = process.env.META_CLIENT_ID;
      const redirectUri = process.env.META_REDIRECT_URI;
      console.log("Instagram OAuth Start", {
        META_CLIENT_ID: process.env.META_CLIENT_ID,
        META_REDIRECT_URI: process.env.META_REDIRECT_URI,
        state
      });
      const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173";

      if (clientId && redirectUri) {
        const authorizeUrl = `https://www.instagram.com/oauth/authorize?enable_fb_login=0&force_authentication=1&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_business_basic,instagram_business_manage_insights&response_type=code&state=${state}`;
        console.log("[Instagram StartOAuth] Generated URL:", authorizeUrl);
        console.log("[Instagram OAuth Debug]", {
          clientId,
          redirectUri,
          authorizeUrl,
          state
        });
        return res.status(200).json({ url: authorizeUrl });
      } else {
        // Fallback Mock Mode: Redirect back with mock connected params and verified state
        const mockCallbackUrl = `${frontendUrl}/settings?instagram_mock_connect=true&state=${state}`;
        return res.status(200).json({ url: mockCallbackUrl });
      }
    } catch (err) {
      next(err);
    }
  }

  static async oauthCallback(req: Request, res: Response, next: NextFunction) {
    try {
      const { code, state, error, error_description } = req.query;
      const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173";

      console.log(`[Instagram Debug] step=controller.oauthCallback.start endpoint=GET /api/instagram/oauth/callback query=${JSON.stringify(req.query)} status=processing`);

      if (error) {
        console.error(`[Instagram Debug] step=controller.oauthCallback.metaError error=${error} error_description=${error_description} status=error`);
        return res.redirect(`${frontendUrl}/settings?instagram_error=${encodeURIComponent(String(error_description || error))}`);
      }

      if (!state || typeof state !== "string" || !code || typeof code !== "string") {
        console.error(`[Instagram Debug] step=controller.oauthCallback.invalidParams status=error`);
        return res.redirect(`${frontendUrl}/settings?instagram_error=Invalid%20request%20parameters`);
      }

      // Find the user who initiated this state
      const user = await prisma.user.findFirst({
        where: { instagramOAuthState: state }
      });

      if (!user) {
        console.error(`[Instagram Debug] step=controller.oauthCallback.stateNotFound state=${state} status=error`);
        return res.redirect(`${frontendUrl}/settings?instagram_error=OAuth%20state%20verification%20failed%20or%20expired`);
      }

      console.log(`[Instagram Debug] step=controller.oauthCallback.userFound userId=${user.id} status=processing`);

      // Verify the state matches what we stored to prevent CSRF
      if (user.instagramOAuthState !== state) {
        console.error(`[Instagram Debug] step=controller.oauthCallback.csrfMismatch userId=${user.id} status=error`);
        return res.redirect(`${frontendUrl}/settings?instagram_error=CSRF%20state%20mismatch`);
      }

      // Exchange code or fallback to mock token if in test
      let accessToken: string;
      let expiresAt: Date | null = null;
      let tokenType: string | null = null;
      let profile: { id: string; username: string; media_count?: number; account_type?: string };

      const clientId = process.env.META_CLIENT_ID;
      const clientSecret = process.env.META_CLIENT_SECRET;
      const redirectUri = process.env.META_REDIRECT_URI;
      const allowMocks = process.env.ALLOW_INSTAGRAM_MOCKS === "true";

      if (!allowMocks && (code.startsWith("mock") || code.startsWith("mock-"))) {
        console.error(`[Instagram Debug] step=controller.oauthCallback.mockRejected userId=${user.id} status=error error=Mock connection rejected due to ALLOW_INSTAGRAM_MOCKS=false`);
        return res.redirect(`${frontendUrl}/settings?instagram_connect=error&instagram_error=OAuth+Failed`);
      }

      if (!code.startsWith("mock") && clientId && clientSecret && redirectUri) {
        try {
          console.log(`[Instagram Debug] step=controller.oauthCallback.exchangeStart userId=${user.id} clientId=${clientId} redirectUri=${redirectUri} status=processing`);
          const shortToken = await InstagramOAuth.getAccessToken(clientId, clientSecret, redirectUri, code);
          console.log(`[Instagram Debug] step=controller.oauthCallback.tokenReceived userId=${user.id} status=processing`);
          
          console.log(`[Instagram Debug] step=controller.oauthCallback.longLivedExchangeStart userId=${user.id} status=processing`);
          const longLivedRes = await InstagramOAuth.exchangeForLongLivedToken(clientSecret, shortToken);
          accessToken = longLivedRes.accessToken;
          expiresAt = new Date(Date.now() + longLivedRes.expiresIn * 1000);
          tokenType = "LONG_LIVED";
          console.log(`[Instagram Debug] step=controller.oauthCallback.longLivedTokenReceived userId=${user.id} expiresAt=${expiresAt} status=processing`);

          profile = await InstagramService.getProfile(accessToken);
          console.log(`[Instagram Debug] step=controller.oauthCallback.profileReceived userId=${user.id} instagramUserId=${profile.id} instagramUsername=${profile.username} status=processing`);
        } catch (err: any) {
          console.error(`[Instagram Debug] step=controller.oauthCallback.exchangeError userId=${user.id} error=${err.message} stack=${err.stack}`);
          if (!allowMocks) {
            return res.redirect(`${frontendUrl}/settings?instagram_connect=error&instagram_error=OAuth+Failed`);
          } else {
            console.warn(`[OAuthCallback] Real OAuth flow failed, falling back to mock: ${err.message}`);
            accessToken = `mock-token-${Date.now()}`;
            expiresAt = new Date(Date.now() + 5183944 * 1000);
            tokenType = "LONG_LIVED";
            profile = {
              id: "mock-ig-id-99999",
              username: "mock_creator_partner",
              account_type: "CREATOR",
              media_count: 12,
            };
          }
        }
      } else {
        if (!allowMocks) {
          console.error(`[Instagram Debug] step=controller.oauthCallback.mocksForbiddenNoCredentials userId=${user.id} status=error`);
          return res.redirect(`${frontendUrl}/settings?instagram_connect=error&instagram_error=OAuth+Failed`);
        } else {
          console.log(`[Instagram Debug] step=controller.oauthCallback.useMockFallback userId=${user.id} status=processing`);
          accessToken = code.startsWith("mock") ? code : `mock-token-${Date.now()}`;
          expiresAt = new Date(Date.now() + 5183944 * 1000);
          tokenType = "LONG_LIVED";
          profile = {
            id: "mock-ig-id-99999",
            username: "mock_creator_partner",
            account_type: "CREATOR",
            media_count: 12,
          };
        }
      }

      // Update User account
      console.log(`[Instagram Debug] step=controller.oauthCallback.updateUserDB userId=${user.id} instagramUserId=${profile.id} status=processing`);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          instagramUserId: profile.id,
          instagramUsername: profile.username,
          instagramAccessToken: accessToken,
          instagramConnectedAt: new Date(),
          instagramTokenExpiresAt: expiresAt,
          instagramTokenType: tokenType,
          instagramOAuthState: null, // Clear state after use
        }
      });

      console.log(`[Instagram Debug] step=controller.oauthCallback.success userId=${user.id} status=success`);
      // Redirect user back to frontend settings page with success moment query param
      return res.redirect(`${frontendUrl}/settings?instagram_connect=success`);
    } catch (err: any) {
      console.error(`[Instagram Debug] step=controller.oauthCallback.exception error=${err.message} stack=${err.stack} status=error`);
      const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}/settings?instagram_error=${encodeURIComponent(err.message || "OAuth failed")}`);
    }
  }

  static async oauthDiagnostics(req: Request, res: Response, next: NextFunction) {
    try {
      const clientId = process.env.META_CLIENT_ID;
      const clientSecret = process.env.META_CLIENT_SECRET;
      const redirectUri = process.env.META_REDIRECT_URI;
      const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173";
      const nodeEnv = process.env.NODE_ENV;

      const results: any = {
        META_CLIENT_ID: clientId,
        META_CLIENT_SECRET_LOADED: clientSecret ? "true" : "false",
        META_REDIRECT_URI: redirectUri,
        FRONTEND_URL: frontendUrl,
        NODE_ENV: nodeEnv,
        META_REDIRECT_URI_EXACT_MATCH: redirectUri === "https://second-brain-backend-production-43b4.up.railway.app/api/instagram/oauth/callback" ? "PASS" : "FAIL"
      };

      const form = new URLSearchParams();
      form.append("client_id", clientId || "");
      form.append("client_secret", clientSecret || "");
      form.append("grant_type", "authorization_code");
      form.append("redirect_uri", redirectUri || "");
      form.append("code", "AQB_TEST_CODE_FOR_DIAGNOSTICS");

      try {
        const metaRes = await fetch("https://api.instagram.com/oauth/access_token", {
          method: "POST",
          body: form,
        });

        results.metaResponseStatus = metaRes.status;
        results.metaResponseStatusText = metaRes.statusText;
        results.metaResponseHeaders = {};
        metaRes.headers.forEach((val, key) => {
          results.metaResponseHeaders[key] = val;
        });

        const data = await metaRes.json();
        results.metaResponseBody = data;
      } catch (metaErr: any) {
        results.metaResponseError = metaErr.message;
      }

      try {
        const debugUrl = `https://graph.facebook.com/debug_token?input_token=dummy_token&access_token=${clientId}|${clientSecret}`;
        const debugRes = await fetch(debugUrl);
        results.facebookDebugTokenStatus = debugRes.status;
        const debugData = await debugRes.json();
        results.facebookDebugTokenBody = debugData;
      } catch (debugErr: any) {
        results.facebookDebugTokenError = debugErr.message;
      }

      return res.status(200).json(results);
    } catch (err) {
      next(err);
    }
  }

  static async getStatus(req: Request, res: Response, next: NextFunction) {
    try {
      const userId = req.user!.id;
      const user = await prisma.user.findUnique({
        where: { id: userId },
      });

      if (!user || !user.instagramAccessToken) {
        return res.status(200).json({ connected: false });
      }

      let daysRemaining = null;
      let requiresReconnect = false;

      if (user.instagramTokenExpiresAt) {
        const diffMs = user.instagramTokenExpiresAt.getTime() - Date.now();
        daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
        if (diffMs <= 0) {
          requiresReconnect = true;
        }
      }

      return res.status(200).json({
        connected: true,
        username: user.instagramUsername,
        expiresAt: user.instagramTokenExpiresAt,
        daysRemaining,
        requiresReconnect,
        tokenType: user.instagramTokenType || "UNKNOWN",
      });
    } catch (err) {
      next(err);
    }
  }
}
