import { InstagramProfile } from "./instagram.types";

export class InstagramScraper {
  static async scrapeProfile(profileUrl: string): Promise<InstagramProfile> {
    console.log("Simulating scrape for URL:", profileUrl);
    
    // Attempt to extract username from URL
    const match = profileUrl.match(/instagram\.com\/([^/?#]+)/i);
    const username = match ? match[1] : "aesthetic_brand";
    
    // Return structured profile data
    return {
      username,
      fullName: username.replace(/[\._-]/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
      followersCount: 25400,
      biography: "Curated tools for slow living, minimalist routines, and focused workspaces.",
      postsCount: 184,
      recentPosts: [
        { id: "p1", url: `${profileUrl}/p/1`, caption: "Morning rituals in warm light.", likes: 840, comments: 32 },
        { id: "p2", url: `${profileUrl}/p/2`, caption: "Introducing the cork desk pad.", likes: 1120, comments: 54 }
      ]
    };
  }
}
