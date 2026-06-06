import { Worker, Job } from "bullmq";
import { redisConnection, isRedisEnabled } from "../config/redis";
import { prisma } from "../config/db";
import { InstagramPublishingService } from "../services/instagram/instagram.publishing.service";
import { instagramPublishQueue } from "../config/queues";

if (isRedisEnabled && redisConnection) {
  /**
   * Startup Recovery
   *
   * Runs once before the Worker is constructed.
   * Finds all PublishingJobs that are PENDING and whose publishAt has already
   * passed — these are jobs that were created in DB but never made it into
   * the BullMQ delayed queue (e.g., because Redis was down at schedule time).
   * Each such job is immediately re-enqueued at delay=0.
   */
  async function recoverOrphanedJobs(): Promise<void> {
    try {
      const now = new Date();
      const orphanedJobs = await prisma.publishingJob.findMany({
        where: {
          status: "PENDING",
          OR: [
            { publishAt: { lt: now } },
            { attempts: 0 }
          ]
        },
        include: { post: true }
      });

      if (orphanedJobs.length === 0) {
        console.log("[Worker: instagram-publish] Startup recovery: no orphaned jobs found.");
        return;
      }

      console.warn(
        `[Worker: instagram-publish] Startup recovery: found ${orphanedJobs.length} orphaned job(s). Re-enqueuing...`
      );

      for (const job of orphanedJobs) {
        // Only re-enqueue if the post is still in a publishable state
        if (job.post.status !== "SCHEDULED" && job.post.status !== "PUBLISHING") {
          console.log(
            `[Worker: instagram-publish] Startup recovery: skipping job ${job.id} — post status is ${job.post.status}`
          );
          continue;
        }

        if (!instagramPublishQueue) {
          console.error("[Worker: instagram-publish] Startup recovery: instagramPublishQueue not available, aborting.");
          break;
        }

        const delay = Math.max(0, job.publishAt.getTime() - now.getTime());

        await instagramPublishQueue.add(
          "publish-job",
          { jobId: job.id, postId: job.postId },
          { delay, attempts: 3, backoff: { type: "exponential", delay: 60000 } }
        );
        console.log(
          `[Worker: instagram-publish] Startup recovery: re-enqueued job ${job.id} (post: ${job.postId}, due: ${job.publishAt.toISOString()}, delay: ${delay}ms)`
        );
      }
    } catch (err) {
      // Recovery failures must NOT crash the worker — log and continue
      console.error("[Worker: instagram-publish] Startup recovery error:", err);
    }
  }

  // Run recovery before starting the worker so past-due jobs are not lost
  recoverOrphanedJobs().then(() => {
    console.log("[Worker: instagram-publish] Startup recovery complete. Initialising worker...");

    const worker = new Worker(
      "instagram-publish",
      async (job: Job) => {
        const { jobId, postId } = job.data;
        console.log(`[Worker: instagram-publish] Starting job ${jobId} for post ${postId}`);

        // 1. Fetch DB records
        const publishingJob = await prisma.publishingJob.findUnique({
          where: { id: jobId },
          include: { post: { include: { brolls: true } }, user: true },
        });

        if (!publishingJob) {
          throw new Error(`PublishingJob ${jobId} not found`);
        }

        const post = publishingJob.post;
        const user = publishingJob.user;

        if (!user.instagramAccessToken || !user.instagramUserId) {
          throw new Error("User does not have an active Instagram connection.");
        }

        // We only process if post is SCHEDULED or PUBLISHING
        if (post.status !== "SCHEDULED" && post.status !== "PUBLISHING") {
          throw new Error(`Post ${postId} is in invalid state for publishing: ${post.status}`);
        }

        // 2. Set statuses to PROCESSING / PUBLISHING
        await prisma.publishingJob.update({
          where: { id: jobId },
          data: { status: "PROCESSING" },
        });

        await prisma.post.update({
          where: { id: postId },
          data: { status: "PUBLISHING" },
        });

        // 3. Resolve Media URL
        const broll = post.brolls?.[0];
        const imageUrl = broll?.fileUrl || "https://res.cloudinary.com/demo/image/upload/v1312461204/sample.jpg";
        const caption = post.caption || post.title || "";

        // 4. Publish via Service
        try {
          const instagramMediaId = await InstagramPublishingService.publishMedia(
            user.instagramUserId,
            user.instagramAccessToken,
            imageUrl,
            caption
          );

          // 5. On Success
          await prisma.publishingJob.update({
            where: { id: jobId },
            data: {
              status: "COMPLETED",
              instagramMediaId,
            },
          });

          await prisma.post.update({
            where: { id: postId },
            data: { status: "PUBLISHED" },
          });

          console.log(`[Worker: instagram-publish] Successfully published job ${jobId}. Media ID: ${instagramMediaId}`);
        } catch (err: any) {
          console.error(`[Worker: instagram-publish] Failed publishing job ${jobId}:`, err);
          // Let BullMQ catch this so it triggers the retry flow via the failed listener
          throw err;
        }
      },
      {
        connection: redisConnection as any,
        concurrency: 1, // Rate limit: one publish at a time for safety
      }
    );

    worker.on("failed", async (job: Job | undefined, err: Error) => {
      if (!job) return;
      const { jobId, postId } = job.data;

      // Increment attempts in our DB
      const currentJob = await prisma.publishingJob.findUnique({ where: { id: jobId } });
      if (!currentJob) return;

      const newAttempts = currentJob.attempts + 1;
      const isFinalRetry = job.attemptsMade >= (job.opts.attempts || 3) - 1;

      await prisma.publishingJob.update({
        where: { id: jobId },
        data: {
          attempts: newAttempts,
          lastError: err.message,
          // Use PENDING between retries (not PROCESSING) to avoid confusing the stuck-job detector
          status: isFinalRetry ? "FAILED" : "PENDING",
        },
      });

      if (isFinalRetry) {
        await prisma.post.update({
          where: { id: postId },
          data: { status: "FAILED" },
        });
        console.log(`[Worker: instagram-publish] Job ${jobId} permanently failed after ${newAttempts} attempt(s).`);
      } else {
        console.warn(`[Worker: instagram-publish] Job ${jobId} failed (attempt ${newAttempts}). BullMQ will retry.`);
      }
    });

    console.log("BullMQ worker 'instagram-publish' initialized.");
  });
} else {
  console.log("BullMQ worker 'instagram-publish' bypassed (Redis is disabled).");
}
