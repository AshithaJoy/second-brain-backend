import { openai } from "../../config/openai";
import { prisma } from "../../config/db";
import { HOOKS_SYSTEM_PROMPT, getHooksUserPrompt } from "../../prompts/hooks/hooks.prompt";
import { COLLABS_SYSTEM_PROMPT, getCollabsUserPrompt } from "../../prompts/collabs/collabs.prompt";
import { REWRITE_SYSTEM_PROMPT, getRewriteUserPrompt } from "../../prompts/rewrite/rewrite.prompt";
import { REELS_SYSTEM_PROMPT, getReelsUserPrompt } from "../../prompts/reels/reels.prompt";
import { CAPTIONS_SYSTEM_PROMPT, getCaptionsUserPrompt } from "../../prompts/captions/captions.prompt";

// Import centralized mock generators
import { generateMockRewrite } from "./mock/rewrite.mock";
import { generateMockHooks } from "./mock/hooks.mock";
import { generateMockCollab } from "./mock/collab.mock";
import { generateMockReel } from "./mock/reel.mock";
import { generateMockCaptions } from "./mock/caption.mock";
import { INSTAGRAM_INTEGRATION_SYSTEM_PROMPT, getInstagramIntelligencePrompt } from "../../prompts/instagram/intelligence.prompt";
import { generateMockInstagramIntelligence } from "./mock/instagramIntelligence.mock";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class OpenAIService {
  private static isLive(): boolean {
    return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0;
  }

  static async getCreatorProfile(userId?: string): Promise<any> {
    if (!userId) return null;
    try {
      return await prisma.creatorProfile.findUnique({
        where: { userId },
      });
    } catch (err) {
      console.error("Failed to query creator profile:", err);
      return null;
    }
  }

  static async getCreatorProfileContext(userId?: string): Promise<string> {
    const profile = await this.getCreatorProfile(userId);
    if (!profile) return "";

    const parseJsonArray = (val: any) => {
      if (!val) return [];
      if (typeof val === "string") {
        try {
          return JSON.parse(val);
        } catch (e) {
          return [];
        }
      }
      return Array.isArray(val) ? val : [];
    };

    const secondary = parseJsonArray(profile.secondaryNiches).join(", ") || "None";
    const formats = parseJsonArray(profile.preferredFormats).join(", ") || "Mixed";
    const pillars = parseJsonArray(profile.contentPillars).join(", ") || "All";

    return `
[CREATOR DNA PROFILE]
- Primary Niche: ${profile.primaryNiche}
- Secondary Niches: ${secondary}
- Primary Goal: ${profile.primaryGoal}
- Audience Size: ${profile.audienceSize}
- Creator Stage: ${profile.creatorStage}
- Posting Frequency: ${profile.postingFrequency}
- Preferred Formats: ${formats}
- Core Content Pillars: ${pillars}
- Tone of Voice: ${profile.toneOfVoice}
- Biggest Challenge: ${profile.biggestChallenge}
- AI Assistance Level: ${profile.aiAssistanceLevel}

Ensure all generated hooks, captions, content recommendations, rewrites, and plans align with this profile. Customize the output based on:
1. Niche & Topics: Tailor terminology to the creator's niches (${profile.primaryNiche}, ${secondary}) and pillars (${pillars}).
2. Tone: Adhere to the tone of voice: "${profile.toneOfVoice}".
3. Creator Stage: Craft recommendations suitable for a "${profile.creatorStage}" creator (e.g. adjust technical difficulty/complexity).
4. Goal: Direct call-to-actions to support their primary goal: "${profile.primaryGoal}".
5. AI Assistance Level: If level is "Minimal", give simple brief ideas/suggestions. If "Balanced", give suggestions + drafts. If "Aggressive", provide full, detailed plans and draft copy.
`;
  }

  static async generateHooks(title: string, mood: string, userId?: string): Promise<any> {
    const profile = await this.getCreatorProfile(userId);
    if (this.isLive()) {
      try {
        const dnaContext = await this.getCreatorProfileContext(userId);
        const systemPrompt = HOOKS_SYSTEM_PROMPT + (dnaContext ? "\n" + dnaContext : "");
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: getHooksUserPrompt(title, mood) },
          ],
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");
        return { ...result, mode: "live" };
      } catch (err) {
        console.error("OpenAI API error, falling back to mock:", err);
      }
    }

    // Mock mode with latency simulation
    await delay(1000 + Math.random() * 500);
    return generateMockHooks(title, mood, profile);
  }

  static async generatePitch(brandName: string, profileUrl: string, niche: string): Promise<any> {
    if (this.isLive()) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: COLLABS_SYSTEM_PROMPT },
            { role: "user", content: getCollabsUserPrompt(brandName, profileUrl, niche) },
          ],
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");
        return { ...result, mode: "live" };
      } catch (err) {
        console.error("OpenAI API error, falling back to mock:", err);
      }
    }

    // Mock mode with latency simulation
    await delay(1000 + Math.random() * 1000);
    return generateMockCollab(brandName, profileUrl, niche);
  }

  static async rewriteDump(title: string, rawText: string, userId?: string): Promise<any> {
    const profile = await this.getCreatorProfile(userId);
    if (this.isLive()) {
      try {
        const dnaContext = await this.getCreatorProfileContext(userId);
        const systemPrompt = REWRITE_SYSTEM_PROMPT + (dnaContext ? "\n" + dnaContext : "");
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: getRewriteUserPrompt(title, rawText) },
          ],
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");
        return { ...result, mode: "live" };
      } catch (err) {
        console.error("OpenAI API error, falling back to mock:", err);
      }
    }

    // Mock mode with latency simulation
    await delay(2000 + Math.random() * 1000);
    return generateMockRewrite(title, rawText, profile);
  }

  static async breakdownReel(url: string): Promise<any> {
    if (this.isLive()) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: REELS_SYSTEM_PROMPT },
            { role: "user", content: getReelsUserPrompt(url) },
          ],
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");
        return { ...result, mode: "live" };
      } catch (err) {
        console.error("OpenAI API error, falling back to mock:", err);
      }
    }

    // Mock mode with latency simulation
    await delay(5000 + Math.random() * 1000);
    return generateMockReel(url);
  }

  static async generateCaptions(title: string, mood: string, hooksData?: any, userId?: string): Promise<any> {
    const profile = await this.getCreatorProfile(userId);
    if (this.isLive()) {
      try {
        const dnaContext = await this.getCreatorProfileContext(userId);
        const systemPrompt = CAPTIONS_SYSTEM_PROMPT + (dnaContext ? "\n" + dnaContext : "");
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: getCaptionsUserPrompt(title, mood, hooksData?.hooks) },
          ],
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");
        return { ...result, mode: "live" };
      } catch (err) {
        console.error("OpenAI API error, falling back to mock:", err);
      }
    }

    // Mock mode with latency simulation
    await delay(1500 + Math.random() * 1500);
    return generateMockCaptions(title, mood, hooksData, profile);
  }

  static async analyzeInstagramContent(profile: any, media: any[], analytics: any, userId?: string): Promise<any> {
    const creatorProfile = await this.getCreatorProfile(userId);
    if (this.isLive()) {
      try {
        const dnaContext = await this.getCreatorProfileContext(userId);
        const systemPrompt = INSTAGRAM_INTEGRATION_SYSTEM_PROMPT + (dnaContext ? "\n" + dnaContext : "");
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: getInstagramIntelligencePrompt(profile, media, analytics) },
          ],
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");
        return { ...result, mode: "live" };
      } catch (err) {
        console.error("OpenAI API error, falling back to mock:", err);
      }
    }

    // Mock mode with latency simulation
    await delay(2000 + Math.random() * 1000);
    return generateMockInstagramIntelligence(profile, analytics);
  }

  static async futureCollabSuggestions(brands: any[], userId?: string): Promise<any> {
    const dnaContext = await this.getCreatorProfileContext(userId);
    if (this.isLive()) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: `You are an AI brand partnership matching engine. Use the creator DNA profile to suggest the best brand deal alignments.${dnaContext}` },
            { role: "user", content: `Suggest top collaborations from these brands: ${JSON.stringify(brands)}` },
          ],
        });
        return JSON.parse(response.choices[0].message.content || "{}");
      } catch (err) {
        console.error("Failed to generate collab suggestions via OpenAI:", err);
      }
    }
    await delay(1000);
    return { suggestions: brands.slice(0, 2).map((b) => ({ ...b, alignmentScore: 92, reason: "Matches niche perfectly" })) };
  }

  static async futurePlannerRecommendations(posts: any[], userId?: string): Promise<any> {
    const dnaContext = await this.getCreatorProfileContext(userId);
    if (this.isLive()) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: `You are a content calendar optimization assistant. Personalize recommendations for the content planner using the creator DNA profile.${dnaContext}` },
            { role: "user", content: `Suggest planner recommendations based on these post drafts: ${JSON.stringify(posts)}` },
          ],
        });
        return JSON.parse(response.choices[0].message.content || "{}");
      } catch (err) {
        console.error("Failed to generate planner recommendations via OpenAI:", err);
      }
    }
    await delay(1000);
    return { recommendations: ["Post an educational reel tomorrow morning to address your consistency challenge."] };
  }
}
