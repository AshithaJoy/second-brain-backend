import { z } from "zod";

export const CreateJournalEntrySchema = z.object({
  weekStart: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be in YYYY-MM-DD format"),
  mood: z.string().min(1),
  followers: z.number().int().nonnegative().default(0),
  posts: z.number().int().nonnegative().default(0),
  reach: z.number().int().nonnegative().default(0),
  saves: z.number().int().nonnegative().default(0),
  engagement: z.string().default("0"),
  reflection: z.string(),
  wins: z.string(),
  lessons: z.string(),
  notes: z.string().optional().nullable(),
});

export const UpdateJournalEntrySchema = CreateJournalEntrySchema.partial();

export const JournalEntryIdSchema = z.object({
  id: z.string().uuid(),
});
