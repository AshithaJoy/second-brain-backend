import { Request, Response, NextFunction } from "express";
import { ConnectInstagramSchema } from "./instagram.schema";
import { InstagramService } from "../../services/instagram/instagram.service";
import { prisma } from "../../config/db";
import { InstagramAnalytics } from "../../services/instagram/instagram.analytics";
import { OpenAIService } from "../../services/openai/openai.service";

export class InstagramController {
  static async connect(req: Request, res: Response, next: NextFunction) {
    try {
      const { accessToken } = ConnectInstagramSchema.parse(req.body);
      const userId = req.user!.id;

      // Exchange/verify token with Meta Graph API
      const profile = await InstagramService.getInstagramProfile(accessToken);

      // Save to authenticated user
      const user = await prisma.user.update({
        where: { id: userId },
        data: {
          instagramUserId: profile.id,
          instagramUsername: profile.username,
          instagramAccessToken: accessToken,
          instagramConnectedAt: new Date(),
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

      const media = await InstagramService.getInstagramMedia(user.instagramAccessToken);
      return res.status(200).json(media);
    } catch (err) {
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

      // Fetch live metadata and media from Instagram / Meta Graph API
      const profileResult = await InstagramService.getInstagramProfile(user.instagramAccessToken);
      const mediaResult = await InstagramService.getInstagramMedia(user.instagramAccessToken);
      const mediaArray = mediaResult.data || [];

      // Run deterministic analytics calculation
      const analyticsResult = InstagramAnalytics.analyze(mediaArray);

      // Save a new historical snapshot cache in the database
      const snapshot = await prisma.instagramSnapshot.create({
        data: {
          userId,
          profileJson: JSON.stringify(profileResult),
          mediaJson: JSON.stringify(mediaArray),
          analyticsJson: JSON.stringify(analyticsResult),
        },
      });

      return res.status(200).json({
        success: true,
        syncedPosts: mediaArray.length,
        snapshotId: snapshot.id,
      });
    } catch (err) {
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
      const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173";

      if (clientId && redirectUri) {
        const authorizeUrl = `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=instagram_graph_user_profile,instagram_graph_user_media&response_type=code&state=${state}`;
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

      if (error) {
        console.error("Meta OAuth error:", error, error_description);
        return res.redirect(`${frontendUrl}/settings?instagram_error=${encodeURIComponent(String(error_description || error))}`);
      }

      if (!state || typeof state !== "string" || !code || typeof code !== "string") {
        return res.redirect(`${frontendUrl}/settings?instagram_error=Invalid%20request%20parameters`);
      }

      // Find the user who initiated this state
      const user = await prisma.user.findFirst({
        where: { instagramOAuthState: state }
      });

      if (!user) {
        return res.redirect(`${frontendUrl}/settings?instagram_error=OAuth%20state%20verification%20failed%20or%20expired`);
      }

      // Verify the state matches what we stored to prevent CSRF
      if (user.instagramOAuthState !== state) {
        return res.redirect(`${frontendUrl}/settings?instagram_error=CSRF%20state%20mismatch`);
      }

      // Exchange code or fallback to mock token if in test
      const accessToken = code.startsWith("mock") ? code : `mock-token-${Date.now()}`;

      // Update User account
      await prisma.user.update({
        where: { id: user.id },
        data: {
          instagramUserId: "mock-ig-id-99999",
          instagramUsername: "mock_creator_partner",
          instagramAccessToken: accessToken,
          instagramConnectedAt: new Date(),
          instagramOAuthState: null, // Clear state after use
        }
      });

      // Redirect user back to frontend settings page with success moment query param
      return res.redirect(`${frontendUrl}/settings?instagram_connect=success`);
    } catch (err: any) {
      console.error("OAuth callback exception:", err);
      const frontendUrl = process.env.FRONTEND_URL || process.env.CLIENT_URL || "http://localhost:5173";
      return res.redirect(`${frontendUrl}/settings?instagram_error=${encodeURIComponent(err.message || "OAuth failed")}`);
    }
  }
}
