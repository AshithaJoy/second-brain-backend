export interface InstagramProfile {
  username: string;
  fullName?: string;
  followersCount: number;
  biography?: string;
  postsCount: number;
  recentPosts: Array<{
    id: string;
    url: string;
    caption?: string;
    likes: number;
    comments: number;
  }>;
}

export interface OAuthState {
  code: string;
  state?: string;
}
