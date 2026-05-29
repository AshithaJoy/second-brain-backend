import { z } from "zod";

export const BreakdownReelSchema = z.object({
  url: z.string().url(),
});
