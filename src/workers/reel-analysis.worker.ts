import { Worker } from "bullmq";
import { redisConnection, isRedisEnabled } from "../config/redis";
import { prisma } from "../config/db";
import { OpenAIService } from "../services/openai/openai.service";

if (isRedisEnabled && redisConnection) {
  const worker = new Worker(
    "analyze-reel",
    async (job) => {
      console.log(`[Worker: analyze-reel] Processing job ${job.id} for user ${job.data.userId}`);
      const { url, userId, jobId } = job.data;

      try {
        // 1. Run simulated or live OpenAI Reel Breakdown analysis
        const analysis = await OpenAIService.breakdownReel(url);

        // 2. Save result to ReelBreakdown database table
        await prisma.reelBreakdown.create({
          data: {
            url,
            insightsJson: JSON.stringify(analysis.insights),
            stepsJson: JSON.stringify(analysis.steps),
            userId,
          },
        });

        // 3. Update the tracking AIJob status to COMPLETED
        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: "COMPLETED",
            resultJson: JSON.stringify(analysis),
          },
        });

        console.log(`[Worker: analyze-reel] Job ${job.id} completed successfully.`);
      } catch (err: any) {
        console.error(`[Worker: analyze-reel] Job ${job.id} failed:`, err);

        // Update tracking AIJob status to FAILED
        await prisma.aIJob.update({
          where: { id: jobId },
          data: {
            status: "FAILED",
            resultJson: JSON.stringify({ error: err.message || "Failed" }),
          },
        });
        throw err;
      }
    },
    { connection: redisConnection as any }
  );

  worker.on("ready", () => {
    console.log("Worker: analyze-reel is ready.");
  });

  worker.on("failed", (job, err) => {
    console.error(`Worker: analyze-reel job ${job?.id} failed:`, err);
  });
} else {
  console.log("Worker: analyze-reel bypassed (Redis is disabled).");
}
