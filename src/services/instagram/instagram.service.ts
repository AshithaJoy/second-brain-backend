import { InstagramOAuth } from "./instagram.oauth";
import { InstagramScraper } from "./instagram.scraper";
import { InstagramProfile } from "./instagram.types";
import { prisma } from "../../config/db";
import { InstagramAnalytics } from "./instagram.analytics";

export class InstagramApiError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = "InstagramApiError";
    this.statusCode = statusCode;
  }
}

export class InstagramService {
  static async getBrandProfile(profileUrl: string): Promise<InstagramProfile> {
    return InstagramScraper.scrapeProfile(profileUrl);
  }

  static getLoginUrl(clientId: string, redirectUri: string, state?: string): string {
    return InstagramOAuth.getAuthUrl(clientId, redirectUri, state);
  }

  static async exchangeToken(
    code: string,
    clientId: string,
    clientSecret: string,
    redirectUri: string
  ): Promise<string> {
    return InstagramOAuth.getAccessToken(clientId, clientSecret, redirectUri, code);
  }

  static async getProfile(accessToken: string): Promise<{ id: string; username: string; account_type?: string; media_count?: number }> {
    const allowMocks = process.env.ALLOW_INSTAGRAM_MOCKS === "true";

    console.log(`[Instagram Debug] step=service.getProfile.start allowMocks=${allowMocks} status=processing`);

    if (accessToken.startsWith("mock") || accessToken.startsWith("mock-")) {
      if (!allowMocks) {
        console.error(`[Instagram Debug] step=service.getProfile.mockRejected status=error error=Mock access tokens are forbidden in production`);
        throw new InstagramApiError("Instagram connection failed: Mock access tokens are forbidden in production", 401);
      }
      console.log(`[Instagram Debug] step=service.getProfile.mockSuccess status=success`);
      return {
        id: "17841405309208365",
        username: "test_creator",
        account_type: "CREATOR",
        media_count: 12,
      };
    }

    try {
      const url = `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`;
      console.log(`[Instagram Debug] step=service.getProfile.apiCall endpoint=${url.replace(accessToken, "HIDDEN")} status=processing`);
      const res = await fetch(url);
      console.log(`[Instagram Debug] step=service.getProfile.apiResponse status=${res.status}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error(`[Instagram Debug] step=service.getProfile.apiError responseBody=${JSON.stringify(body)} status=error`);
        const isExpired = body.error?.code === 190 || body.error?.type === "OAuthException";
        const status = isExpired ? 401 : 400;
        throw new InstagramApiError(body.error?.message || `Instagram API error: ${res.status}`, status);
      }
      const data = await res.json();
      console.log(`[Instagram Debug] step=service.getProfile.success data=${JSON.stringify(data)} status=success`);
      return data;
    } catch (err: any) {
      console.error(`[Instagram Debug] step=service.getProfile.catch error=${err.message} stack=${err.stack} status=error`);
      if (!allowMocks) {
        if (err instanceof InstagramApiError) {
          throw err;
        }
        throw new InstagramApiError(err.message || "Instagram API request failed", 500);
      }
      console.warn(`[InstagramService.getProfile] Live request failed, falling back to mock profile: ${err.message}`);
      return {
        id: "17841405309208365",
        username: "mock_creator_partner",
        account_type: "CREATOR",
        media_count: 12,
      };
    }
  }

  static async getInstagramProfile(accessToken: string): Promise<{ id: string; username: string; account_type?: string; media_count?: number }> {
    return this.getProfile(accessToken);
  }

  static async getMedia(accessToken: string): Promise<any[]> {
    const allowMocks = process.env.ALLOW_INSTAGRAM_MOCKS === "true";

    console.log(`[Instagram Debug] step=service.getMedia.start allowMocks=${allowMocks} status=processing`);

    if (accessToken.startsWith("mock") || accessToken.startsWith("mock-")) {
      if (!allowMocks) {
        console.error(`[Instagram Debug] step=service.getMedia.mockRejected status=error error=Mock access tokens are forbidden in production`);
        throw new InstagramApiError("Instagram connection failed: Mock access tokens are forbidden in production", 401);
      }
      console.log(`[Instagram Debug] step=service.getMedia.mockSuccess status=success`);
      return [
        {
          id: "17895691234567890",
          caption: "Mindful workspace aesthetic.",
          media_type: "IMAGE",
          media_url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8",
          permalink: "https://instagram.com/p/mock1",
          like_count: 1420,
          comments_count: 56,
          timestamp: new Date().toISOString(),
        },
        {
          id: "17895691234567891",
          caption: "Planning my next reel slots.",
          media_type: "VIDEO",
          media_url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1",
          permalink: "https://instagram.com/p/mock2",
          like_count: 850,
          comments_count: 24,
          timestamp: new Date().toISOString(),
        }
      ];
    }

    try {
      const url = `https://graph.instagram.com/me/media?fields=id,caption,media_type,media_url,permalink,timestamp&access_token=${accessToken}`;
      console.log(`[Instagram Debug] step=service.getMedia.apiCall endpoint=${url.replace(accessToken, "HIDDEN")} status=processing`);
      const res = await fetch(url);
      console.log(`[Instagram Debug] step=service.getMedia.apiResponse status=${res.status}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error(`[Instagram Debug] step=service.getMedia.apiError responseBody=${JSON.stringify(body)} status=error`);
        const isExpired = body.error?.code === 190 || body.error?.type === "OAuthException";
        const status = isExpired ? 401 : 400;
        throw new InstagramApiError(body.error?.message || `Instagram API error: ${res.status}`, status);
      }
      const result = await res.json();
      const mediaList = result.data || [];
      console.log(`[Instagram Debug] step=service.getMedia.success mediaCount=${mediaList.length} status=success`);
      return mediaList;
    } catch (err: any) {
      console.error(`[Instagram Debug] step=service.getMedia.catch error=${err.message} stack=${err.stack} status=error`);
      if (!allowMocks) {
        if (err instanceof InstagramApiError) {
          throw err;
        }
        throw new InstagramApiError(err.message || "Instagram API request failed", 500);
      }
      console.warn(`[InstagramService.getMedia] Live request failed, falling back to mock media: ${err.message}`);
      return [
        {
          id: "17895691234567890",
          caption: "Mindful workspace aesthetic.",
          media_type: "IMAGE",
          media_url: "https://images.unsplash.com/photo-1507238691740-187a5b1d37b8",
          permalink: "https://instagram.com/p/mock1",
          like_count: 1420,
          comments_count: 56,
          timestamp: new Date().toISOString(),
        },
        {
          id: "17895691234567891",
          caption: "Planning my next reel slots.",
          media_type: "VIDEO",
          media_url: "https://images.unsplash.com/photo-1531297484001-80022131f5a1",
          permalink: "https://instagram.com/p/mock2",
          like_count: 850,
          comments_count: 24,
          timestamp: new Date().toISOString(),
        }
      ];
    }
  }

  static async getInstagramMedia(accessToken: string): Promise<{ data: any[] }> {
    const list = await this.getMedia(accessToken);
    return { data: list };
  }

  static async refreshProfileData(userId: string): Promise<{ success: boolean; snapshotId: string; syncedPosts: number }> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || !user.instagramAccessToken) {
      throw new Error("Instagram account not connected");
    }

    let accessToken = user.instagramAccessToken;
    let expiresAt = user.instagramTokenExpiresAt;
    let tokenType = user.instagramTokenType;

    const clientSecret = process.env.META_CLIENT_SECRET;

    // Check if tokenType is unknown or null, then upgrade on sync
    if (!tokenType || tokenType === "UNKNOWN") {
      if (clientSecret && !accessToken.startsWith("mock") && !accessToken.startsWith("mock-")) {
        try {
          const longLivedRes = await InstagramOAuth.exchangeForLongLivedToken(clientSecret, accessToken);
          accessToken = longLivedRes.accessToken;
          expiresAt = new Date(Date.now() + longLivedRes.expiresIn * 1000);
          tokenType = "LONG_LIVED";
          console.log(`[Instagram Sync] Token upgraded successfully to LONG_LIVED for userId=${userId}`);
        } catch (err: any) {
          console.warn(`[Instagram Sync] Token upgrade failed: ${err.message}`);
          tokenType = "UNKNOWN";
        }
      } else if (accessToken.startsWith("mock") || accessToken.startsWith("mock-")) {
        expiresAt = new Date(Date.now() + 5183944 * 1000);
        tokenType = "LONG_LIVED";
      }
    }

    const profile = await this.getProfile(accessToken);
    const media = await this.getMedia(accessToken);
    
    // Process analytics
    const analytics = InstagramAnalytics.analyze(media);

    // Save snapshot and update User if token got upgraded
    const updateData: any = {
      instagramUserId: profile.id,
      instagramUsername: profile.username,
    };
    if (accessToken !== user.instagramAccessToken) {
      updateData.instagramAccessToken = accessToken;
    }
    if (expiresAt !== user.instagramTokenExpiresAt) {
      updateData.instagramTokenExpiresAt = expiresAt;
    }
    if (tokenType !== user.instagramTokenType) {
      updateData.instagramTokenType = tokenType;
    }

    await prisma.user.update({
      where: { id: userId },
      data: updateData,
    });

    const snapshot = await prisma.instagramSnapshot.create({
      data: {
        userId,
        profileJson: JSON.stringify(profile),
        mediaJson: JSON.stringify(media),
        analyticsJson: JSON.stringify(analytics),
      },
    });

    return {
      success: true,
      snapshotId: snapshot.id,
      syncedPosts: media.length,
    };
  }
}
