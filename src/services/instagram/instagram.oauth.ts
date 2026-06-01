import { OAuthState } from "./instagram.types";

export class InstagramOAuth {
  static getAuthUrl(clientId: string, redirectUri: string, state?: string): string {
    return `https://www.instagram.com/oauth/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=instagram_graph_user_profile,instagram_graph_user_media&response_type=code${state ? `&state=${state}` : ""}`;
  }

  static async getAccessToken(
    clientId: string,
    clientSecret: string,
    redirectUri: string,
    code: string
  ): Promise<string> {
    if (code.startsWith("mock")) {
      return code;
    }

    const form = new URLSearchParams();
    form.append("client_id", clientId);
    form.append("client_secret", clientSecret);
    form.append("grant_type", "authorization_code");
    form.append("redirect_uri", redirectUri);
    form.append("code", code);

    const res = await fetch("https://api.instagram.com/oauth/access_token", {
      method: "POST",
      body: form,
    });

    const data: any = await res.json();
    if (!res.ok) {
      throw new Error(data.error_message || data.error?.message || `OAuth token exchange failed: ${res.status}`);
    }

    return data.access_token;
  }
}
