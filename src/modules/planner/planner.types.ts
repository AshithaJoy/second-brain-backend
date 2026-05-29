import { PostType, PostStatus } from "@prisma/client";

export interface CreatePostInput {
  title: string;
  date: string;
  type?: PostType;
  status?: PostStatus;
  mood: string;
  caption?: string;
  hashtags?: string;
  shootId?: string | null;
}

export interface UpdatePostInput {
  title?: string;
  date?: string;
  type?: PostType;
  status?: PostStatus;
  mood?: string;
  caption?: string;
  hashtags?: string;
  shootId?: string | null;
}
