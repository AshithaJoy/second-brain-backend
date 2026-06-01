export function generateMockInstagramIntelligence(profile: any, media: any[], analytics: any) {
  const username = profile.username || "test_creator";
  const pillarList = Object.entries(analytics?.contentPillars || {})
    .sort((a: any, b: any) => b[1] - a[1])
    .map(([k]) => k);

  const primaryPillar = pillarList[0] || "productivity";

  // Generate hook suggestions dynamically from REAL media if available
  const hookSuggestions = [];
  const realPostsWithCaptions = (media || []).filter((m: any) => m.caption && m.caption.trim().length > 0);

  if (realPostsWithCaptions.length > 0) {
    // Post 1
    const p1 = realPostsWithCaptions[0];
    const orig1 = p1.caption.split("\n")[0].substring(0, 60);
    hookSuggestions.push({
      original: orig1,
      improved: `This is why your hook "${orig1}" underperforms (How to fix)`,
      rationale: "Replacing a passive statement with an active curiosity loop immediately hooks creator attention."
    });

    // Post 2 if available
    if (realPostsWithCaptions.length > 1) {
      const p2 = realPostsWithCaptions[1];
      const orig2 = p2.caption.split("\n")[0].substring(0, 60);
      hookSuggestions.push({
        original: orig2,
        improved: `Stop writing posts like: ${orig2}. Do this instead.`,
        rationale: "Introduces urgency and a contrarian take that stops the scroll."
      });
    } else {
      hookSuggestions.push({
        original: "Mindful workspace aesthetic.",
        improved: "The exact workspace layout that doubled my editing speed (Tour)",
        rationale: "Swapping a passive statement for an active curiosity loop immediately hooks creator attention."
      });
    }
  } else {
    // Default mock fallback
    hookSuggestions.push(
      {
        original: "Mindful workspace aesthetic.",
        improved: "The exact workspace layout that doubled my editing speed (Tour)",
        rationale: "Swapping a passive statement for an active curiosity loop immediately hooks creator attention."
      },
      {
        original: "Planning my next reel slots.",
        improved: "Stop scheduling posts before you build these 3 soft systems.",
        rationale: "Introduces urgency and introduces a contrarian take that stops the scroll."
      }
    );
  }

  return {
    mode: "mock",
    opportunities: [
      analytics?.contentDistribution?.carouselPercentage === 0
        ? "No carousels posted recently. Add multi-slide Carousels to share actionable guides and boost saves."
        : "You haven't posted a carousel in 21 days. Try using a 5-step checklist style to diversify formats.",
      "Educational tips are highly active but currently underrepresented in your pillars."
    ],
    hookSuggestions,
    suggestedNewHooks: [
      "This 1 change saved me 15 hours of editing weekly.",
      "The workspace design nobody talks about in 2026.",
      "3 systems I built to stop content creation burnout.",
      "Don't start another creator channel until you watch this.",
      "My honest mistake that lost me a ₹50,000 brand collab.",
      "How to pitch brands with under 10k followers.",
      "My desk setup layout that keeps me calm during deadlines.",
      "The exact email templates I use to close dream deals.",
      "Stop scrolling if you are rebuilding your workspace.",
      "Why soft systems are more important than hard goals."
    ],
    ideas: {
      reels: [
        {
          title: "My 15-Hour Editing Shortcut Tour",
          concept: "Shoot a 5-second aesthetic video showing a macro view of your keyboard, timeline cutting, and setup. Loop it with a text hook overlay.",
          suggestedHook: "This 1 change saved me 15 hours of editing weekly.",
          caption: "If you are editing content every day, you are wasting time. Here is the exact shortcuts layout I set up to cut timeline drag by 40%. Share this with a creator who needs it! #editors #creator #desksetup #workspace"
        },
        {
          title: "Behind the Scenes of a Collab Pitch",
          concept: "Record a screen capture of drafting an email pitch. Show key sections: brand values alignment, deliverables list, and pricing guide.",
          suggestedHook: "The exact email templates I use to close brand deals.",
          caption: "Landing brand collabs isn't luck. It's structure. Here is how I pitched my latest deal. Save this for your next outreach! #creatorlife #branddeals #collabs #systems"
        }
      ],
      carousels: [
        {
          title: "3 Productivity Systems I Actually Use",
          concept: "Slide 1: Hook title. Slide 2: Daily brain dumps. Slide 3: Timeboxing calendar slots. Slide 4: B-roll vaults. Slide 5: CTA to comment 'systems' for templates.",
          suggestedHook: "3 systems I built to stop content creation burnout.",
          caption: "Systems over goals. When you feel overwhelmed, look at your workspace organization, not your motivation. Comment below with your favorite systems! #productivity #workspace #creators"
        }
      ],
      stories: [
        {
          title: "Workspace Poll Q&A",
          concept: "Create a story showing a coffee cup on your desk. Add a slider poll: 'How calm is your desk setup right now?' followed by a Question Box: 'Ask me anything about my workspace setup.'"
        },
        {
          title: "Planner Preview Sneak Peek",
          concept: "Upload a quick screenshot of your calendar layout. Add an interactive template sticker asking followers to suggest ideas for the empty slots."
        }
      ]
    },
    recommendations: [
      "Introduce a consistent 'Tuesday/Thursday' publishing cadence to establish steady follower routines.",
      "Use carousels for structured checklists to boost saves, which Meta prioritizes for reach.",
      "Inject more personal failure stories under your personal pillar to build deep creator credibility."
    ]
  };
}
