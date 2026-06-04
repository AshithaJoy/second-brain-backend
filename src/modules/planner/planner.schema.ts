import { z } from "zod";
import { PostType, PostStatus } from "@prisma/client";

export const CreatePostSchema = z.object({
  title: z.string().min(1),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  type: z.nativeEnum(PostType).optional(),
  status: z.nativeEnum(PostStatus).optional(),
  mood: z.string(),
  caption: z.string().optional(),
  hashtags: z.string().optional(),
  shootId: z.string().uuid().optional().nullable(),
  brollIds: z.array(z.string().uuid()).optional(),
  publishAt: z.string().datetime().optional().nullable(),
});

export const UpdatePostSchema = CreatePostSchema.partial();

export const PostIdSchema = z.object({
  id: z.union([
    z.string().uuid(),
    z.string().regex(/^\d+$/)
  ]),
});

export const GenerateHooksSchema = z.object({
  postId: z.string().uuid(),
});

export const GenerateCaptionsSchema = z.object({
  postId: z.string().uuid(),
});

export const CreateShootSchema = z.object({
  name: z.string().min(1),
  shootDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotsJson: z.string(),
  postId: z.string().uuid().nullable().optional(),
});

export const UpdateShootSchema = CreateShootSchema.partial();

export const ShootIdSchema = z.object({
  id: z.string().uuid(),
});
