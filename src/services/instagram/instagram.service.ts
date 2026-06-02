import { InstagramOAuth } from "./instagram.oauth";
import { InstagramScraper } from "./instagram.scraper";
import { InstagramProfile } from "./instagram.types";
import { prisma } from "../../config/db";
import { InstagramAnalytics } from "./instagram.analytics";

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
    const isProduction = process.env.NODE_ENV === "production";

    if (accessToken.startsWith("mock")) {
      if (isProduction) {
        throw new Error("Instagram connection failed: Mock access tokens are forbidden in production");
      }
      return {
        id: "17841405309208365",
        username: "test_creator",
        account_type: "CREATOR",
        media_count: 12,
      };
    }

    try {
      const url = `https://graph.instagram.com/me?fields=id,username,account_type,media_count&access_token=${accessToken}`;
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message || `Instagram API error: ${res.status}`);
      }
      return await res.json();
    } catch (err: any) {
      if (isProduction) {
        console.error(`[InstagramService.getProfile] Live request failed in production: ${err.message}`);
        throw new Error(`Instagram connection failed: ${err.message}`);
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
    const isProduction = process.env.NODE_ENV === "production";

    if (accessToken.startsWith("mock")) {
      if (isProduction) {
        throw new Error("Instagram connection failed: Mock access tokens are forbidden in production");
      }
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
      const res = await fetch(url);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error?.message || `Instagram API error: ${res.status}`);
      }
      const result = await res.json();
      return result.data || [];
    } catch (err: any) {
      if (isProduction) {
        console.error(`[InstagramService.getMedia] Live request failed in production: ${err.message}`);
        throw new Error(`Instagram connection failed: ${err.message}`);
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

    const profile = await this.getProfile(user.instagramAccessToken);
    const media = await this.getMedia(user.instagramAccessToken);
    
    // Process analytics
    const analytics = InstagramAnalytics.analyze(media);

    // Save snapshot
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
