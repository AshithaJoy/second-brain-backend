import { ReelsRepository } from "./reels.repository";
import { AIRepository } from "../ai/ai.repository";
import { AuthRepository } from "../auth/auth.repository";
import { analyzeReelQueue } from "../../config/queues";
import { safeEnqueue } from "../../utils/queue";

export class ReelsService {
  static async getBreakdowns(userId: string) {
    return ReelsRepository.findMany(userId);
  }

  static async breakdownReel(url: string, userId: string) {
    // Check and deduct credits first
    await AuthRepository.checkAndDecrementCredits(userId);

    // Create AI Job
    const job = await AIRepository.createJob(userId, "analyze-reel");

    // Add safely
    await safeEnqueue(
      analyzeReelQueue,
      `analyze-reel-${job.id}`,
      {
        url,
        userId,
        jobId: job.id,
      },
      { jobId: job.id }
    );

    return job;
  }

  static async deleteBreakdown(id: string, userId: string) {
    return ReelsRepository.delete(id, userId);
  }
}
