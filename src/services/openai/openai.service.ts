import { openai } from "../../config/openai";
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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export class OpenAIService {
  private static isLive(): boolean {
    return !!process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim().length > 0;
  }

  static async generateHooks(title: string, mood: string): Promise<any> {
    if (this.isLive()) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: HOOKS_SYSTEM_PROMPT },
            { role: "user", content: getHooksUserPrompt(title, mood) },
          ],
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");
        return { ...result, mode: "live" };
      } catch (err) {
        console.error("OpenAI API error, falling back to mock:", err);
      }
    }

    // Mock mode with 1000 - 1500 ms latency simulation
    await delay(1000 + Math.random() * 500);
    return generateMockHooks(title, mood);
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

    // Mock mode with 1000 - 2000 ms latency simulation
    await delay(1000 + Math.random() * 1000);
    return generateMockCollab(brandName, profileUrl, niche);
  }

  static async rewriteDump(title: string, rawText: string): Promise<any> {
    if (this.isLive()) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: REWRITE_SYSTEM_PROMPT },
            { role: "user", content: getRewriteUserPrompt(title, rawText) },
          ],
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");
        return { ...result, mode: "live" };
      } catch (err) {
        console.error("OpenAI API error, falling back to mock:", err);
      }
    }

    // Mock mode with 2000 - 3000 ms latency simulation
    await delay(2000 + Math.random() * 1000);
    return generateMockRewrite(title, rawText);
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

    // Mock mode with 5000 - 6000 ms latency simulation
    await delay(5000 + Math.random() * 1000);
    return generateMockReel(url);
  }

  static async generateCaptions(title: string, mood: string, hooksData?: any): Promise<any> {
    if (this.isLive()) {
      try {
        const response = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: CAPTIONS_SYSTEM_PROMPT },
            { role: "user", content: getCaptionsUserPrompt(title, mood, hooksData?.hooks) },
          ],
        });

        const result = JSON.parse(response.choices[0].message.content || "{}");
        return { ...result, mode: "live" };
      } catch (err) {
        console.error("OpenAI API error, falling back to mock:", err);
      }
    }

    // Mock mode with 1500 - 3000 ms latency simulation
    await delay(1500 + Math.random() * 1500);
    return generateMockCaptions(title, mood, hooksData);
  }
}
