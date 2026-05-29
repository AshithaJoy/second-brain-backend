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
}
