export class ContentGapEngine {
  static analyzeGaps(mediaItems: any[], creatorProfile: any) {
    const gaps = [];
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;

    if (!mediaItems || mediaItems.length === 0) {
      return [];
    }

    // Sort media by date descending
    const sortedMedia = [...mediaItems].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    const mostRecentPost = sortedMedia[0];
    const mostRecentTimestamp = new Date(mostRecentPost.timestamp).getTime();

    // 1. Cadence Gap
    const daysSinceLastPost = Math.floor((now - mostRecentTimestamp) / oneDay);
    if (daysSinceLastPost > 3) {
      gaps.push({
        type: "Cadence Alert",
        description: `You haven't posted in ${daysSinceLastPost} days. Algorithm momentum may decrease.`
      });
    }

    // 2. Format Gap
    const recentFormats = sortedMedia.slice(0, 10).map(m => m.media_type || m.mediaType);
    const hasReel = recentFormats.includes("VIDEO") || recentFormats.includes("REEL");
    if (!hasReel && creatorProfile?.preferredFormats?.includes("Reels")) {
      gaps.push({
        type: "Format Gap",
        description: "You haven't posted a Reel recently, missing out on your preferred format for reach."
      });
    }

    // 3. Topic Gap (Basic Implementation)
    // We would ideally look at InstagramAIAnalysis topics, but for MVP we just check if they are posting at all.
    if (creatorProfile?.contentPillars && Array.isArray(creatorProfile.contentPillars)) {
      gaps.push({
        type: "Topic Alignment",
        description: `Ensure your next post hits one of your core pillars: ${creatorProfile.contentPillars.slice(0, 2).join(", ")}.`
      });
    }

    return gaps;
  }
}
