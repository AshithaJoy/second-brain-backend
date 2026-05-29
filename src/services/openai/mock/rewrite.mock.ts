export function generateMockRewrite(title: string, rawText: string) {
  const cleanTitle = title.replace(/^✨ AI:\s*/i, "") || "Aesthetic Vlog Idea";
  
  // High quality deterministic creator response
  const hooks = [
    `"They say consistency is key, but here is the raw reality behind ${cleanTitle.toLowerCase()}..."`,
    `"The secret to rebuilding your creator routine without burning out..."`,
    `"POV: documenting the systems that keep you focused."`
  ];
  
  const captions = [
    `Sometimes the best work happens in the quiet moments before the rest of the world wakes up. Here is a look at the system I'm building step by step. #${cleanTitle.replace(/\s+/g, "").toLowerCase()}`,
    `Documenting > perfecting. Rebuilding daily workflow slowly one morning at a time. #creatorlife #routinereset`
  ];

  const shotIdeas = [
    "0:00 - 0:03 | Close-up of typing on keyboard in soft, natural morning light.",
    "0:03 - 0:10 | Panning shot of workspace details (e.g. coffee steam rising, notebook layout).",
    "0:10 - 0:15 | Static slow-mo shot wrapping up study session or reading."
  ];

  const cta = "Let me know in the comments if you prefer raw vlog edits or highly polished guides.";
  
  const hashtags = ["creatorlife", "productivity", "slowliving", "routinereset", "desksetup"];

  return {
    mode: "mock",
    title: `✨ AI: ${cleanTitle}`,
    rewrittenText: rawText.trim().length > 0 
      ? `✨ POLISHED STORYBOARD OUTLINE ✨\n\nOriginal Concept: ${rawText}\n\nThis workflow details how to present your daily focus routine visually. Focus on cozy aesthetics, warm details, and slow tracking movement. Keep speech low-tempo and ambient.` 
      : "✨ CREATED FROM KINFOLK LIFESTYLE STYLE ✨\n\nThis concept outlines a visual reset routine. Focus on warm lamp lighting, textured desk pads, and high contrast detail shots.",
    hooks,
    captions,
    shotIdeas,
    cta,
    hashtags
  };
}
