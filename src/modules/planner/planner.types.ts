import { PostType, PostStatus } from "@prisma/client";

export interface CreatePostInput {
  title: string;
  date: string;
  type?: PostType;
  status?: PostStatus;
  mood: string;
  caption?: string;
  hashtags?: string;
  notes?: string | null;
  shootId?: string | null;
  brollIds?: string[];
  publishAt?: string | null;
}

export interface UpdatePostInput {
  title?: string;
  date?: string;
  type?: PostType;
  status?: PostStatus;
  mood?: string;
  caption?: string;
  hashtags?: string;
  notes?: string | null;
  shootId?: string | null;
  brollIds?: string[];
  publishAt?: string | null;
}
