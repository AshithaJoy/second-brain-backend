export function generateMockCollab(brandName: string, profileUrl: string, niche: string) {
  let estimatedAmount = 14000;
  let suggestedDels = [
    { text: "1x Aesthetic B-Roll review Reel showcasing integration", type: "reel" },
    { text: "2x Daily routine integration Stories with stickers", type: "story" }
  ];
  let brandAesthetic = "cozy creative lifestyle and soft textures";

  if (brandName.toLowerCase().includes("linen") || brandName.toLowerCase().includes("candle")) {
    estimatedAmount = 12500;
    suggestedDels = [
      { text: "1x Cinematic morning vlog Reel featuring product placement", type: "reel" },
      { text: "2x Aesthetic Story reviews with direct purchase link", type: "story" }
    ];
    brandAesthetic = "slow living, organic neutrals, and natural lighting";
  } else if (
    brandName.toLowerCase().includes("keyboard") || 
    brandName.toLowerCase().includes("tech") || 
    brandName.toLowerCase().includes("timer") || 
    brandName.toLowerCase().includes("journal") || 
    brandName.toLowerCase().includes("pad")
  ) {
    estimatedAmount = 18000;
    suggestedDels = [
      { text: "1x High-retention desktop setup workflow Reel", type: "reel" },
      { text: "1x Carousel showing coding/design system detail closeups", type: "carousel" }
    ];
    brandAesthetic = "minimalist desk layouts, crisp details, and focused workflows";
  }

  return {
    mode: "mock",
    quote: estimatedAmount,
    negotiatedAmount: estimatedAmount,
    deliverables: suggestedDels,
    pitchDraft: `Hi Team at ${brandName},\n\nI just completed an aesthetic assessment of your profile page via ${profileUrl}.\n\nBased on your brand's focus on ${brandAesthetic}, I have designed a dedicated video concept that fits perfectly with my creator audience:\n- 1x High-retention Reel mapping your product into a slow daily routine.\n- Supporting Stories showing close-ups of product build quality.\n\nRecommended rate package for this concept: ₹${estimatedAmount}.\n\nLet me know if you would like me to prepare a custom moodboard!\n\nWarmly,\nMe`,
    notes: `AI Strategy Recommendation: Optimal rate set to ₹${estimatedAmount} due to strong alignment with ${brandAesthetic}.`
  };
}
