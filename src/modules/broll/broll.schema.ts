import { z } from "zod";

export const CreateBRollSchema = z.object({
  title: z.string().min(1),
  description: z.string(),
  mood: z.string(),
  visualTags: z.array(z.string()),
  emotionTags: z.array(z.string()),
  location: z.string().optional().nullable(),
  lighting: z.string().optional().nullable(),
  motionType: z.string().optional().nullable(),
  audioFeeling: z.string().optional().nullable(),
  timeOfDay: z.string().optional().nullable(),
  weather: z.string().optional().nullable(),
  clipType: z.string().default("video"),
  cinematicUse: z.string().optional().nullable(),
  energy: z.string().default("soft"),
  notes: z.string().optional().nullable(),
  fileUrl: z.string().optional().nullable(),
  thumbnailUrl: z.string().optional().nullable(),
  favorite: z.boolean().optional(),
});

export const UpdateBRollSchema = CreateBRollSchema.partial();

export const BRollIdSchema = z.object({
  id: z.string().uuid(),
});
