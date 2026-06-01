import { InstagramOAuth } from "./instagram.oauth";
import { InstagramScraper } from "./instagram.scraper";
import { InstagramProfile } from "./instagram.types";

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

  static async getInstagramProfile(accessToken: string): Promise<{ id: string; username: string; media_count?: number }> {
    if (accessToken.startsWith("mock")) {
      return {
        id: "17841405309208365",
        username: "test_creator",
        media_count: 12,
      };
    }

    const url = `https://graph.instagram.com/v25.0/me?fields=id,username,media_count&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || `Instagram API error: ${res.status}`);
    }
    return res.json();
  }

  static async getInstagramMedia(accessToken: string): Promise<any> {
    if (accessToken.startsWith("mock")) {
      return {
        data: [
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
        ]
      };
    }

    const url = `https://graph.instagram.com/v25.0/me/media?fields=id,caption,media_type,media_url,permalink,like_count,comments_count,timestamp&access_token=${accessToken}`;
    const res = await fetch(url);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error?.message || `Instagram API error: ${res.status}`);
    }
    return res.json();
  }
}
