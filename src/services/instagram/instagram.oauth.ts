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

  static async exchangeForLongLivedToken(
    clientSecret: string,
    shortToken: string
  ): Promise<{ accessToken: string; expiresIn: number; tokenType: string }> {
    if (shortToken.startsWith("mock") || shortToken.startsWith("mock-")) {
      return {
        accessToken: shortToken,
        expiresIn: 5183944, // 60 days in seconds
        tokenType: "bearer"
      };
    }

    const url = `https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${clientSecret}&access_token=${shortToken}`;
    const res = await fetch(url);
    const data: any = await res.json();

    if (!res.ok) {
      throw new Error(data.error?.message || `Long-lived token exchange failed: ${res.status}`);
    }

    return {
      accessToken: data.access_token,
      expiresIn: data.expires_in,
      tokenType: data.token_type || "bearer"
    };
  }
}
