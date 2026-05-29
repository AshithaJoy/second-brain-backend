import { z } from "zod";

export const CaptionSchema = z.object({
  mode: z.enum(["mock", "live"]),
  shortCaptions: z.array(z.string()),
  longCaptions: z.array(z.string()),
  storytellingCaptions: z.array(z.string()),
  ctas: z.array(z.string()),
  hashtagGroups: z.array(z.array(z.string())),
  postingTips: z.array(z.string()),
});

export type CaptionResult = z.infer<typeof CaptionSchema>;
