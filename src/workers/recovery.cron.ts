import { prisma } from "../config/db";
import { instagramPublishQueue } from "../config/queues";
import { isRedisEnabled } from "../config/redis";

const RECOVERY_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
const STUCK_THRESHOLD_MINUTES = 10;

export function startRecoveryCron() {
  if (!isRedisEnabled) {
    console.log("[Recovery Cron] Bypassed (Redis disabled).");
    return;
  }

  console.log("[Recovery Cron] Started. Interval: 5 minutes.");

  setInterval(async () => {
    try {
      console.log("[Recovery Cron] Running...");
      const now = new Date();
      const stuckCutoff = new Date(now.getTime() - STUCK_THRESHOLD_MINUTES * 60 * 1000);

      // ── 1. Re-enqueue past-due PENDING jobs ───────────────────────────────
      // These are jobs whose publishAt has already passed but are still PENDING.
      // Covers the case where the worker was offline when the delay window expired.
      const stalledJobs = await prisma.publishingJob.findMany({
        where: {
          status: "PENDING",
          publishAt: { lte: now }
        },
        include: { post: true }
      });

      if (stalledJobs.length === 0) {
        console.log("[Recovery Cron] No past-due stalled jobs found.");
      } else {
        console.warn(`[Recovery Cron] Found ${stalledJobs.length} past-due stalled job(s). Re-enqueuing...`);

        for (const job of stalledJobs) {
          if (!instagramPublishQueue) continue;

          // Skip if the post is no longer in a publishable state
          if (job.post.status !== "SCHEDULED" && job.post.status !== "PUBLISHING") {
            console.log(
              `[Recovery Cron] Skipping stalled job ${job.id} — post status is ${job.post.status}`
            );
            continue;
          }

          await instagramPublishQueue.add(
            "publish-job",
            { jobId: job.id, postId: job.postId },
            { delay: 0, attempts: 3, backoff: { type: "exponential", delay: 60000 } }
          );
          console.log(`[Recovery Cron] Re-enqueued past-due job ${job.id} (post: ${job.postId})`);
        }
      }

      // ── 2. Detect STUCK jobs ───────────────────────────────────────────────
      // A job is STUCK if it:
      //   • is still PENDING
      //   • has never been attempted (attempts === 0)
      //   • was created more than STUCK_THRESHOLD_MINUTES ago
      //   • publishAt is still in the future (past-due ones are handled above)
      //
      // This catches the case where BullMQ enqueue silently failed AFTER the
      // DB transaction committed (e.g., mid-restart), leaving the job with a
      // future publishAt that will never fire.
      const stuckJobs = await prisma.publishingJob.findMany({
        where: {
          status: "PENDING",
          attempts: 0,
          createdAt: { lt: stuckCutoff },
          publishAt: { gt: now }
        },
        include: { post: true }
      });

      if (stuckJobs.length === 0) {
        console.log("[Recovery Cron] No stuck jobs found.");
      } else {
        console.warn(`[Recovery Cron] Found ${stuckJobs.length} stuck job(s). Marking STUCK...`);

        for (const job of stuckJobs) {
          await prisma.publishingJob.update({
            where: { id: job.id },
            data: {
              status: "STUCK",
              lastError: `Job was created ${STUCK_THRESHOLD_MINUTES}+ minutes ago but was never enqueued. Detected by recovery cron.`
            }
          });
          console.warn(
            `[Recovery Cron] Job ${job.id} (post: ${job.postId}) marked STUCK. Created: ${job.createdAt.toISOString()}, PublishAt: ${job.publishAt.toISOString()}`
          );
        }
      }

      console.log("[Recovery Cron] Run complete.");
    } catch (err) {
      console.error("[Recovery Cron] Error during recovery check:", err);
    }
  }, RECOVERY_INTERVAL_MS);
}
