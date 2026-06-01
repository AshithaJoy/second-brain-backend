import { z } from "zod";

export const SaveProfileSchema = z.object({
  primaryNiche: z.string().min(1, "Primary niche is required"),
  secondaryNiches: z.array(z.string()),
  primaryGoal: z.string().min(1, "Primary goal is required"),
  audienceSize: z.string().min(1, "Audience size is required"),
  creatorStage: z.string().min(1, "Creator stage is required"),
  postingFrequency: z.string().min(1, "Posting frequency is required"),
  preferredFormats: z.array(z.string()).min(1, "At least one preferred format is required"),
  contentPillars: z.array(z.string()).min(1, "At least one content pillar is required").max(5, "Maximum 5 content pillars allowed"),
  toneOfVoice: z.string().min(1, "Tone of voice is required"),
  biggestChallenge: z.string().min(1, "Biggest challenge is required"),
  aiAssistanceLevel: z.enum(["Minimal", "Balanced", "Aggressive"], {
    errorMap: () => ({ message: "AI assistance level must be Minimal, Balanced, or Aggressive" }),
  }),
});
