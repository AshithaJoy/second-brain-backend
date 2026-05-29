import { OAuthState } from "./instagram.types";

export class InstagramOAuth {
  static getAuthUrl(clientId: string, redirectUri: string, state?: string): string {
    return `https://api.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=user_profile,user_media&response_type=code${state ? `&state=${state}` : ""}`;
  }

  static async getAccessToken(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    code: string
  ): Promise<string> {
    // Mock OAuth token exchange
    console.log("Initiating token exchange for code:", code);
    return "mock-instagram-oauth-access-token-987654321";
  }
}
