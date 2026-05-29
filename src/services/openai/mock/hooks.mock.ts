import { HookResult } from "../../../modules/ai/schemas/hook.schema";

export function generateMockHooks(title: string, mood: string): HookResult {
  const cleanTitle = title.replace(/^✨ AI:\s*/i, "") || "Aesthetic Vlog Idea";
  const cleanMood = mood || "cinematic";

  // Viral hooks targeting modern retention-focused short-form storytelling
  const hooks = [
    `"They say consistency is key, but here is the raw reality behind ${cleanTitle.toLowerCase()}..."`,
    `"The secret to rebuilding your routine around ${cleanTitle.toLowerCase()} without burning out..."`,
    `"POV: documenting the systems that actually keep you focused as a creator."`
  ];

  const openingShots = [
    `Close-up of typing on a keyboard in soft, warm lamp lighting with coffee steam rising.`,
    `Slow tracking shot of workspace details (notebook layout, green desk pad, warm accents).`,
    `Split screen showing before (messy room setup) vs after (highly organized, cozy workspace).`
  ];

  const emotionalAngles = [
    `Routine Reset: Returning to daily focus and mindfulness step-by-step.`,
    `Mindful Creator: Moving away from toxic hustle culture and prioritizing mental space.`,
    `Creative Solitude: Capturing the beauty of quiet morning hours before the world wakes up.`
  ];

  const titleIdeas = [
    `How to Reset Your Focus Routine`,
    `My 6 AM Workspace Ritual`,
    `Minimalist Systems for Creators`
  ];

  const ctas = [
    `Save this post for your next routine reset day.`,
    `Share this with a fellow creator who needs a mindful shift.`,
    `Comment 'systems' and I'll send you my slow focus Notion templates.`
  ];

  const hashtags = [
    `creatorlife`,
    `routinereset`,
    `desksetup`,
    `slowproductivity`,
    `minimalistlifestyle`
  ];

  return {
    mode: "mock",
    hooks,
    openingShots,
    emotionalAngles,
    titleIdeas,
    ctas,
    hashtags
  };
}
