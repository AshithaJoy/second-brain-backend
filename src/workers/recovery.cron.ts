import { prisma } from "../config/db";
import { instagramPublishQueue } from "../config/queues";
import { isRedisEnabled } from "../config/redis";

const RECOVERY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function startRecoveryCron() {
  if (!isRedisEnabled) {
    console.log("[Recovery Cron] Bypassed (Redis disabled).");
    return;
  }

  console.log("[Recovery Cron] Started. Interval: 5 minutes.");

  setInterval(async () => {
    try {
      console.log("[Recovery Cron] Checking for stalled publishing jobs...");

      const now = new Date();
      // Find jobs that should have published by now but are still PENDING
      const stalledJobs = await prisma.publishingJob.findMany({
        where: {
          status: "PENDING",
          publishAt: { lte: now }
        },
        include: { post: true }
      });

      if (stalledJobs.length === 0) {
        console.log("[Recovery Cron] No stalled jobs found.");
        return;
      }

      console.warn(`[Recovery Cron] Found ${stalledJobs.length} stalled jobs. Re-enqueuing...`);

      for (const job of stalledJobs) {
        if (!instagramPublishQueue) continue;

        // Skip if somehow the post is no longer scheduled
        if (job.post.status !== "SCHEDULED" && job.post.status !== "PUBLISHING") {
          console.log(`[Recovery Cron] Skipping job ${job.id} because post is in status ${job.post.status}`);
          continue;
        }

        await instagramPublishQueue.add(
          "publish-job",
          { jobId: job.id, postId: job.postId },
          { delay: 0, attempts: 3, backoff: { type: "exponential", delay: 60000 } }
        );
        console.log(`[Recovery Cron] Re-enqueued job ${job.id} (Post: ${job.postId})`);
      }
    } catch (err) {
      console.error("[Recovery Cron] Error during recovery check:", err);
    }
  }, RECOVERY_INTERVAL_MS);
}
