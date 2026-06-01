import { CaptionResult } from "../../../modules/ai/schemas/caption.schema";

export function generateMockCaptions(title: string, mood: string, hooksData?: any, profile?: any): CaptionResult {
  const cleanTitle = title.replace(/^✨ AI:\s*/i, "") || "Aesthetic Vlog Idea";
  const cleanMood = mood || "cinematic";

  const niche = profile?.primaryNiche || "Lifestyle";
  const goal = profile?.primaryGoal || "Grow followers";
  const tone = profile?.toneOfVoice || "Friendly";

  let hooksHookText = "";
  if (hooksData && Array.isArray(hooksData.hooks) && hooksData.hooks.length > 0) {
    // Pipeline Chaining: Consume first generated hook in caption generation
    hooksHookText = ` (Inspired by hook: ${hooksData.hooks[0]})`;
  }

  const shortCaptions = [
    `Quiet morning resets are the only way I stay sane as a ${niche.toLowerCase()} creator.${hooksHookText} #${cleanTitle.replace(/\s+/g, "").toLowerCase()}`,
    `Documenting > perfecting. Rebuilding daily focus systems slow and steady to achieve: ${goal.toLowerCase()}.`
  ];

  const longCaptions = [
    `It took me years of burning out to realize that productivity isn't about working harder. It's about designing a space where your mind has permission to focus slow.${hooksHookText}\n\nToday's setup incorporates warm, cozy lighting, rain sounds, lo-fi tracks, and a strict no-phone boundary. Here is the daily breakdown...`,
    `POV: document > create. Sometimes the best work happens in the quiet moments before the rest of the world wakes up. Rebuilding routine slowly one morning at a time.`
  ];

  const storytellingCaptions = [
    `Let's talk about workspace design. Most advice is about optimization and efficiency. But what if we optimized for calm instead? Today, I reset my desk lighting to a soft golden glow. Instantly, the pressure of a chaotic to-do list started to melt away.${hooksHookText}\n\nHere is how you can set up a low-energy, high-focus workspace too...`
  ];

  const ctas = [
    `Let me know in the comments: do you prefer golden hour ambient lighting or warm desk lamp vibes?`,
    `Save this reel for your next workspace reset day.`,
    `Comment 'CALM' and I'll send you my lo-fi playlist and Notion workspace tracker.`
  ];

  const hashtagGroups = [
    ["creatorlife", "routinereset", "desksetup", "slowliving"],
    ["minimalism", "cozyworkspace", "studygram", "routines"]
  ];

  const postingTips = [
    "Upload during the quiet hours of 7:00 AM - 9:00 AM to align with the slow morning narrative.",
    "Use a low-tempo acoustic or lo-fi audio track to match the visual pacing.",
    "Keep color grading warm, high-contrast, and textured for premium cinematic aesthetics."
  ];

  return {
    mode: "mock",
    shortCaptions,
    longCaptions,
    storytellingCaptions,
    ctas,
    hashtagGroups,
    postingTips
  };
}
