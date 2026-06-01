export interface PostingCadence {
  postsPerWeek: number;
  postsPerMonth: number;
  averageGapBetweenPosts: number; // in days
}

export interface ContentDistribution {
  reelsPercentage: number;
  carouselPercentage: number;
  imagePercentage: number;
  videoPercentage: number;
}

export interface HookItem {
  id: string;
  hook: string;
  engagement: number;
  permalink: string;
}

export interface HookAnalysisResult {
  strongestHooks: HookItem[];
  weakestHooks: HookItem[];
  recurringPatterns: string[];
}

export interface ContentPillars {
  productivity: number;
  business: number;
  lifestyle: number;
  personal: number;
}

export interface InstagramAnalyticsResult {
  postingCadence: PostingCadence;
  contentDistribution: ContentDistribution;
  consistencyScore: number;
  hookAnalysis: HookAnalysisResult;
  contentPillars: ContentPillars;
  opportunities: string[];
  creatorHealthScore: number;
}

export class InstagramAnalytics {
  static analyze(media: any[]): InstagramAnalyticsResult {
    if (!media || media.length === 0) {
      return {
        postingCadence: { postsPerWeek: 0, postsPerMonth: 0, averageGapBetweenPosts: 0 },
        contentDistribution: { reelsPercentage: 0, carouselPercentage: 0, imagePercentage: 0, videoPercentage: 0 },
        consistencyScore: 0,
        hookAnalysis: { strongestHooks: [], weakestHooks: [], recurringPatterns: [] },
        contentPillars: { productivity: 25, business: 25, lifestyle: 25, personal: 25 },
        opportunities: ["Connect your Instagram and publish content to unlock opportunities."],
        creatorHealthScore: 0,
      };
    }

    const cadence = this.calculatePostingCadence(media);
    const distribution = this.calculateContentDistribution(media);
    const consistencyScore = this.calculateConsistencyScore(media, cadence);
    const hookAnalysis = this.calculateHookAnalysis(media);
    const contentPillars = this.calculateContentPillars(media);
    const opportunities = this.calculateOpportunities(media, cadence, distribution, contentPillars);
    const creatorHealthScore = this.calculateCreatorHealthScore(consistencyScore, distribution, cadence);

    return {
      postingCadence: cadence,
      contentDistribution: distribution,
      consistencyScore,
      hookAnalysis,
      contentPillars,
      opportunities,
      creatorHealthScore,
    };
  }

  private static calculatePostingCadence(media: any[]): PostingCadence {
    if (media.length < 2) {
      return {
        postsPerWeek: media.length,
        postsPerMonth: media.length * 4.3,
        averageGapBetweenPosts: 0,
      };
    }

    const timestamps = media
      .map((m) => new Date(m.timestamp).getTime())
      .sort((a, b) => a - b);

    const minTime = timestamps[0];
    const maxTime = timestamps[timestamps.length - 1];
    const spanMs = maxTime - minTime;
    const spanDays = Math.max(spanMs / (1000 * 60 * 60 * 24), 1); // min 1 day

    const postsPerWeek = Number(((media.length / spanDays) * 7).toFixed(1));
    const postsPerMonth = Number(((media.length / spanDays) * 30.4).toFixed(1));

    // calculate gaps
    let totalGapMs = 0;
    for (let i = 1; i < timestamps.length; i++) {
      totalGapMs += (timestamps[i] - timestamps[i - 1]);
    }
    const avgGapDays = Number((totalGapMs / (timestamps.length - 1) / (1000 * 60 * 60 * 24)).toFixed(1));

    return {
      postsPerWeek,
      postsPerMonth,
      averageGapBetweenPosts: avgGapDays,
    };
  }

  private static calculateContentDistribution(media: any[]): ContentDistribution {
    const total = media.length;
    if (total === 0) {
      return { reelsPercentage: 0, carouselPercentage: 0, imagePercentage: 0, videoPercentage: 0 };
    }

    let reelsCount = 0;
    let carouselCount = 0;
    let imageCount = 0;
    let videoCount = 0;

    media.forEach((m) => {
      const type = (m.media_type || "").toUpperCase();
      if (type === "VIDEO") {
        reelsCount++;
        videoCount++;
      } else if (type === "CAROUSEL_ALBUM") {
        carouselCount++;
      } else if (type === "IMAGE") {
        imageCount++;
      }
    });

    return {
      reelsPercentage: Math.round((reelsCount / total) * 100),
      carouselPercentage: Math.round((carouselCount / total) * 100),
      imagePercentage: Math.round((imageCount / total) * 100),
      videoPercentage: Math.round((videoCount / total) * 100),
    };
  }

  private static calculateConsistencyScore(media: any[], cadence: PostingCadence): number {
    if (media.length < 2) return 50;

    // standard gap calculation
    const avgGap = cadence.averageGapBetweenPosts;
    
    // Ideal gap is 1-3 days. Gaps longer than 5 days decrease consistency
    let baseScore = 100;
    if (avgGap <= 3) {
      baseScore = 95;
    } else if (avgGap <= 5) {
      baseScore = 80;
    } else if (avgGap <= 7) {
      baseScore = 60;
    } else {
      baseScore = 40;
    }

    // Adjust score based on gap variance (standard deviation of gaps)
    const timestamps = media
      .map((m) => new Date(m.timestamp).getTime())
      .sort((a, b) => a - b);

    const gaps: number[] = [];
    for (let i = 1; i < timestamps.length; i++) {
      gaps.push((timestamps[i] - timestamps[i - 1]) / (1000 * 60 * 60 * 24));
    }

    const mean = gaps.reduce((acc, v) => acc + v, 0) / gaps.length;
    const variance = gaps.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / gaps.length;
    const stdDev = Math.sqrt(variance);

    // High standard deviation means highly erratic posting gaps
    let penalty = 0;
    if (stdDev > 4) {
      penalty = 20;
    } else if (stdDev > 2) {
      penalty = 10;
    }

    return Math.max(0, Math.min(100, baseScore - penalty));
  }

  private static calculateHookAnalysis(media: any[]): HookAnalysisResult {
    const hooks: HookItem[] = media.map((m) => {
      const caption = m.caption || "";
      // extract first line or sentence
      const firstLine = caption.split("\n")[0].trim() || "No caption hook";
      const engagement = (m.like_count || 0) + (m.comments_count || 0);
      return {
        id: m.id,
        hook: firstLine,
        engagement,
        permalink: m.permalink || "",
      };
    });

    const sortedByEngagement = [...hooks].sort((a, b) => b.engagement - a.engagement);
    
    const strongestHooks = sortedByEngagement.slice(0, 3);
    const weakestHooks = [...sortedByEngagement].reverse().slice(0, 3);

    // Identify recurring opening patterns
    const patterns = ["how to", "why you", "stop doing", "here is", "this is", "secret", "never", "3 tips"];
    const foundPatterns: Record<string, number> = {};

    hooks.forEach((h) => {
      const text = h.hook.toLowerCase();
      patterns.forEach((pat) => {
        if (text.includes(pat)) {
          foundPatterns[pat] = (foundPatterns[pat] || 0) + 1;
        }
      });
    });

    const recurringPatterns = Object.entries(foundPatterns)
      .sort((a, b) => b[1] - a[1])
      .map(([pat]) => pat);

    return {
      strongestHooks,
      weakestHooks,
      recurringPatterns: recurringPatterns.length > 0 ? recurringPatterns : ["aesthetic visual openings"],
    };
  }

  private static calculateContentPillars(media: any[]): ContentPillars {
    const keywords = {
      productivity: ["productivity", "work", "desk", "edit", "setup", "workspace", "focus", "habit", "schedule", "system", "time", "planning", "layout", "tips", "organize"],
      business: ["monetize", "business", "client", "brand", "money", "deals", "contract", "charge", "price", "revenue", "income", "sales", "pitch", "rate", "earn"],
      lifestyle: ["day", "vlog", "travel", "coffee", "creator", "routine", "aesthetic", "weekend", "morning", "night", "life", "outfit", "view"],
      personal: ["me", "story", "behind", "mistake", "failed", "lessons", "wins", "thought", "feeling", "growth", "journey", "reflect", "experience", "myself"],
    };

    const counts = { productivity: 0, business: 0, lifestyle: 0, personal: 0 };
    let totalMatches = 0;

    media.forEach((m) => {
      const text = (m.caption || "").toLowerCase();
      let matched = false;

      Object.entries(keywords).forEach(([pillar, words]) => {
        const hasMatch = words.some((word) => text.includes(word));
        if (hasMatch) {
          counts[pillar as keyof ContentPillars]++;
          totalMatches++;
          matched = true;
        }
      });

      // Default match if none found to spread distribution
      if (!matched) {
        counts.lifestyle++;
        totalMatches++;
      }
    });

    // Normalize to percentages summing to 100%
    return {
      productivity: Math.round((counts.productivity / totalMatches) * 100) || 25,
      business: Math.round((counts.business / totalMatches) * 100) || 25,
      lifestyle: Math.round((counts.lifestyle / totalMatches) * 100) || 25,
      personal: Math.round((counts.personal / totalMatches) * 100) || 25,
    };
  }

  private static calculateOpportunities(
    media: any[],
    cadence: PostingCadence,
    distribution: ContentDistribution,
    pillars: ContentPillars
  ): string[] {
    const opportunities: string[] = [];

    // Carousel check
    if (distribution.carouselPercentage === 0) {
      opportunities.push("No carousels posted recently. Add multi-slide Carousels to share actionable guides and boost saves.");
    }

    // Reels dependence check
    if (distribution.reelsPercentage > 80) {
      opportunities.push("Heavy dependence on Reels detected. Diversify with Carousels to capture longer dwell times.");
    }

    // Low posting rate check
    if (cadence.postsPerWeek < 2) {
      opportunities.push("Posting cadence is declining (under 2 posts per week). Aim for 3 updates weekly to stay top-of-mind.");
    }

    // Consistency check
    if (cadence.averageGapBetweenPosts > 4) {
      opportunities.push("Inconsistent schedule with average gaps of over 4 days. Establish steady post slots to train user expectation.");
    }

    // Pillar imbalances
    if (pillars.business < 15) {
      opportunities.push("Monetization/Business pillar is underrepresented. Share brand pitches, collab details, or business tips.");
    }
    if (pillars.personal < 15) {
      opportunities.push("Personal storytelling is underrepresented. Build community connection by sharing behind-the-scenes failures and routines.");
    }

    // Default opportunity if none generated
    if (opportunities.length === 0) {
      opportunities.push("Cadence and variety are highly stable! Leverage interactive story polls to optimize community engagement.");
    }

    return opportunities;
  }

  private static calculateCreatorHealthScore(
    consistencyScore: number,
    distribution: ContentDistribution,
    cadence: PostingCadence
  ): number {
    // 1. Consistency Index (40%)
    const consistencyWeight = consistencyScore * 0.4;

    // 2. Diversity Index (30%): Score is high if content formats are distributed
    let diversityScore = 50;
    const formatCount =
      (distribution.reelsPercentage > 0 ? 1 : 0) +
      (distribution.carouselPercentage > 0 ? 1 : 0) +
      (distribution.imagePercentage > 0 ? 1 : 0);

    if (formatCount === 3) diversityScore = 100;
    else if (formatCount === 2) diversityScore = 80;
    else diversityScore = 40;

    const diversityWeight = diversityScore * 0.3;

    // 3. Frequency Index (30%): Score is high if posting frequency is high
    let frequencyScore = 40;
    if (cadence.postsPerWeek >= 4) frequencyScore = 100;
    else if (cadence.postsPerWeek >= 2) frequencyScore = 80;
    else if (cadence.postsPerWeek >= 1) frequencyScore = 60;

    const frequencyWeight = frequencyScore * 0.3;

    return Math.round(consistencyWeight + diversityWeight + frequencyWeight);
  }
}
