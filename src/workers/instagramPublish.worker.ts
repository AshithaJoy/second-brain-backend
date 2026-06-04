import { Worker, Job } from "bullmq";
import { redisConnection, isRedisEnabled } from "../config/redis";
import { prisma } from "../config/db";
import { InstagramPublishingService } from "../services/instagram/instagram.publishing.service";

if (isRedisEnabled && redisConnection) {
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
      // For this MVP execution, we use Cloudinary fileUrl from BRoll, or a mock image if not available
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
        // Let BullMQ catch this so it triggers the retry flow below (failed listener)
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
        status: isFinalRetry ? "FAILED" : "PROCESSING",
      },
    });

    if (isFinalRetry) {
      await prisma.post.update({
        where: { id: postId },
        data: { status: "FAILED" },
      });
      console.log(`[Worker: instagram-publish] Job ${jobId} permanently failed after ${newAttempts} attempts.`);
    }
  });

  console.log("BullMQ worker 'instagram-publish' initialized.");
} else {
  console.log("BullMQ worker 'instagram-publish' bypassed (Redis is disabled).");
}
