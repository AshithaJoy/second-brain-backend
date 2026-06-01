export const INSTAGRAM_INTEGRATION_SYSTEM_PROMPT = `
You are an expert Instagram Creator Strategy consultant. Your goal is to analyze a creator's Instagram account profile, recent posts list, and calculated deterministic metrics to provide strategic recommendations, content opportunities, and fresh post ideas.

Return your response in JSON format matching the schema below:
{
  "opportunities": [
    "A specific opportunity based on their analytics and gaps (e.g. 'Since you have not posted a carousel in 21 days, try doing a carousel checklist to build saves.')"
  ],
  "hookSuggestions": [
    {
      "original": "A weak hook from their recent posts or general hook pattern",
      "improved": "An improved hook variant to increase retention",
      "rationale": "Why this change makes the hook more engaging"
    }
  ],
  "suggestedNewHooks": [
    "10 highly-engaging, direct creator hooks tailored to their niche/pillars (e.g. 'Productivity systems I actually use')"
  ],
  "ideas": {
    "reels": [
      {
        "title": "A short, actionable Reel title",
        "concept": "Explain the concept, visual setup, and visual tags for B-Roll.",
        "suggestedHook": "The first 2 seconds hook overlay text",
        "caption": "Suggested caption writeup including hashtags"
      }
    ],
    "carousels": [
      {
        "title": "Carousel title",
        "concept": "Detailed description of slide-by-slide structure (e.g., slide 1: hook, slide 2-4: steps, slide 5: CTA).",
        "suggestedHook": "Title hook slide text",
        "caption": "Suggested caption writeup"
      }
    ],
    "stories": [
      {
        "title": "Interactive Story concept",
        "concept": "Explanation of polls, questions, slide templates, or CTAs."
      }
    ]
  },
  "recommendations": [
    "A direct strategic growth suggestion (e.g. 'Align Reels with personal failure stories to build visual trust.')"
  ]
}

Ensure all suggestions are highly specific, realistic, and derive directly from the user's content pillars (Productivity, Business, Lifestyle, Personal) and posting gaps.
`;

export function getInstagramIntelligencePrompt(
  profile: { username: string; media_count?: number },
  media: any[],
  analytics: any
): string {
  const mediaSummaries = media.slice(0, 10).map((m) => ({
    type: m.media_type,
    caption: m.caption ? m.caption.substring(0, 120) + "..." : "No caption",
    likes: m.like_count || 0,
    comments: m.comments_count || 0,
  }));

  return `
Account Profile:
- Username: @${profile.username}
- Total Media Count: ${profile.media_count || 0}

Deterministic Analytics:
- Posting Cadence: ${analytics.postingCadence.postsPerWeek} posts/week, ${analytics.postingCadence.postsPerMonth} posts/month
- Average Gap: ${analytics.postingCadence.averageGapBetweenPosts} days
- Content Distribution: Reels ${analytics.contentDistribution.reelsPercentage}%, Carousels ${analytics.contentDistribution.carouselPercentage}%, Images ${analytics.contentDistribution.imagePercentage}%
- Creator Health Score: ${analytics.creatorHealthScore}/100 (Consistency: ${analytics.consistencyScore}/100)
- Core Pillars: Productivity ${analytics.contentPillars.productivity}%, Business ${analytics.contentPillars.business}%, Lifestyle ${analytics.contentPillars.lifestyle}%, Personal ${analytics.contentPillars.personal}%
- Extracted Opportunities (Rule-Based): ${JSON.stringify(analytics.opportunities)}

Recent Posts (Latest 10):
${JSON.stringify(mediaSummaries, null, 2)}

Please perform the strategic analysis and generate the enhanced recommendations, hooks (including 10 suggested new hooks), and content ideas (Reels, Carousels, Stories) matching the requested JSON format.
`;
}
