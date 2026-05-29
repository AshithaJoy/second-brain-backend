import { z } from "zod";

export const HookSchema = z.object({
  mode: z.enum(["mock", "live"]),
  hooks: z.array(z.string()),
  openingShots: z.array(z.string()),
  emotionalAngles: z.array(z.string()),
  titleIdeas: z.array(z.string()),
  ctas: z.array(z.string()),
  hashtags: z.array(z.string()),
});

export type HookResult = z.infer<typeof HookSchema>;
