import { PlannerRepository } from "./planner.repository";
import { CreatePostInput, UpdatePostInput } from "./planner.types";
import { AIRepository } from "../ai/ai.repository";
import { AuthRepository } from "../auth/auth.repository";
import { generateHooksQueue, generateCaptionsQueue, instagramPublishQueue } from "../../config/queues";
import { safeEnqueue } from "../../utils/queue";
import { prisma } from "../../config/db";
import { Post, PostType, PostStatus, JobStatus } from "@prisma/client";

export class PlannerService {
  static async getPosts(userId: string) {
    return PlannerRepository.findMany(userId);
  }

  static async getPostById(id: string, userId: string) {
    const post = await PlannerRepository.findById(id, userId);
    if (!post) {
      const err: any = new Error("Post not found");
      err.statusCode = 404;
      throw err;
    }
    return post;
  }

  static async createPost(userId: string, data: CreatePostInput) {
    return PlannerRepository.create(userId, data);
  }

  static async updatePost(id: string, userId: string, data: UpdatePostInput) {
    // Check post exists first
    await this.getPostById(id, userId);
    return PlannerRepository.update(id, userId, data);
  }

  static async deletePost(id: string, userId: string) {
    await this.getPostById(id, userId);
    return PlannerRepository.delete(id, userId);
  }

  static async generateHooks(id: string, userId: string) {
    const post = await this.getPostById(id, userId);
    
    // Check and deduct credits first
    await AuthRepository.checkAndDecrementCredits(userId);

    // Create tracking AIJob
    const job = await AIRepository.createJob(userId, "generate-hooks");

    // Enqueue job safely
    await safeEnqueue(
      generateHooksQueue,
      `generate-hooks-${job.id}`,
      {
        postId: post.id,
        title: post.title,
        mood: post.mood,
        userId,
        jobId: job.id,
      },
      { jobId: job.id }
    );

    return job;
  }

  static async generateCaptions(id: string, userId: string) {
    const post = await this.getPostById(id, userId);
    
    // Check and deduct credits first
    await AuthRepository.checkAndDecrementCredits(userId);

    // Create tracking AIJob
    const job = await AIRepository.createJob(userId, "generate-captions");

    // Enqueue job safely
    await safeEnqueue(
      generateCaptionsQueue,
      `generate-captions-${job.id}`,
      {
        postId: post.id,
        title: post.title,
        mood: post.mood,
        userId,
        jobId: job.id,
      },
      { jobId: job.id }
    );

    return job;
  }

  static async getShoots(userId: string) {
    return PlannerRepository.findManyShoots(userId);
  }

  static async createShoot(userId: string, data: any) {
    return PlannerRepository.createShoot(userId, data);
  }

  static async updateShoot(id: string, userId: string, data: any) {
    return PlannerRepository.updateShoot(id, userId, data);
  }

  static async deleteShoot(id: string, userId: string) {
    return PlannerRepository.deleteShoot(id, userId);
  }

  /**
   * Validates that the instagram publish queue is initialised and its underlying
   * Redis connection is in a usable state.  Throws a 503 if the queue is not
   * healthy so that we never transition a Post to SCHEDULED when publishing is
   * unavailable.
   */
  private static async assertQueueHealthy(): Promise<void> {
    if (!instagramPublishQueue) {
      throw Object.assign(
        new Error("Publishing queue is unavailable (Redis disabled). Please try again later."),
        { statusCode: 503 }
      );
    }
    // ioredis exposes a .status property on the underlying connection
    const conn = (instagramPublishQueue.opts.connection as any);
    const status: string | undefined = conn?.status;
    if (status && status !== "ready" && status !== "connect") {
      throw Object.assign(
        new Error(`Publishing queue is not ready (Redis status: ${status}). Please try again later.`),
        { statusCode: 503 }
      );
    }
    // Live PING to catch quota-exceeded or network errors before any DB write
    try {
      await (instagramPublishQueue.opts.connection as any).ping();
    } catch (err: any) {
      throw Object.assign(
        new Error(`Publishing queue health check failed: ${err.message}`),
        { statusCode: 503 }
      );
    }
  }

  static async schedulePost(id: string, userId: string) {
    const post = await prisma.post.findUnique({
      where: { id, userId },
      include: { brolls: true }
    });
    if (!post) throw Object.assign(new Error("Post not found"), { statusCode: 404 });

    if (post.status !== PostStatus.APPROVED) {
      throw Object.assign(new Error("Post must be APPROVED before it can be scheduled."), { statusCode: 400 });
    }

    if (!post.publishAt) {
      throw Object.assign(new Error("Post must have a publishAt date set before scheduling."), { statusCode: 400 });
    }

    if (new Date(post.publishAt) <= new Date()) {
      throw Object.assign(new Error("publishAt must be a future date/time."), { statusCode: 400 });
    }

    if (!post.brolls || post.brolls.length === 0) {
      throw Object.assign(new Error("At least one valid media asset must be attached."), { statusCode: 400 });
    }

    const videoAssets = post.brolls.filter(b => b.clipType === "video");
    const imageAssets = post.brolls.filter(b => b.clipType === "image");

    if (post.type === PostType.REEL && videoAssets.length < 1) {
      throw Object.assign(new Error("REEL requires at least 1 video asset."), { statusCode: 400 });
    }
    if (post.type === PostType.IMAGE && imageAssets.length < 1) {
      throw Object.assign(new Error("IMAGE requires at least 1 image asset."), { statusCode: 400 });
    }
    if (post.type === PostType.STORY && videoAssets.length < 1 && imageAssets.length < 1) {
      throw Object.assign(new Error("STORY requires at least 1 image or video asset."), { statusCode: 400 });
    }
    if (post.type === PostType.CAROUSEL && post.brolls.length < 2) {
      throw Object.assign(new Error("CAROUSEL requires at least 2 assets."), { statusCode: 400 });
    }
    if (post.type === PostType.NOTE) {
      throw Object.assign(new Error("NOTE cannot be scheduled."), { statusCode: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw Object.assign(new Error("User not found"), { statusCode: 404 });

    if (!user.instagramUserId || !user.instagramAccessToken) {
      throw Object.assign(new Error("Instagram account must be connected to schedule posts."), { statusCode: 400 });
    }
    if (user.instagramTokenExpiresAt && new Date(user.instagramTokenExpiresAt) <= new Date()) {
      throw Object.assign(new Error("Instagram access token has expired. Please reconnect."), { statusCode: 400 });
    }

    if (!post.caption || post.caption.trim().length === 0) {
      throw Object.assign(new Error("Caption must be added before scheduling."), { statusCode: 400 });
    }

    // ── STEP 1: Verify queue health BEFORE touching the database ──────────
    // If Redis is down/quota exceeded, this throws 503 and the DB is untouched.
    await PlannerService.assertQueueHealthy();

    // ── STEP 2: Commit Post → SCHEDULED and PublishingJob → PENDING inside
    //            a single transaction so both succeed or neither does. ──────
    let updatedPost: Post;
    let job: { id: string };

    try {
      const result = await prisma.$transaction(async (tx) => {
        const txPost = await tx.post.update({
          where: { id },
          data: {
            status: PostStatus.SCHEDULED,
            scheduledAt: new Date(),
            scheduledByUserId: userId
          }
        });

        const txJob = await tx.publishingJob.create({
          data: {
            postId: post.id,
            userId: user.id,
            publishAt: post.publishAt!,
            status: JobStatus.PENDING
          }
        });

        return { txPost, txJob };
      });

      updatedPost = result.txPost;
      job = result.txJob;
    } catch (txErr: any) {
      console.error("[PlannerService] DB transaction failed during schedulePost:", txErr);
      throw Object.assign(
        new Error("Failed to save scheduling data. Please try again."),
        { statusCode: 500 }
      );
    }

    // Update bRoll statuses (non-critical, outside transaction)
    if (post.brolls && post.brolls.length > 0) {
      await prisma.bRoll.updateMany({
        where: { id: { in: post.brolls.map(b => b.id) } },
        data: { status: "SCHEDULED" as any }
      });
    }

    // ── STEP 3: Attempt BullMQ enqueue ────────────────────────────────────
    // The DB is now committed. If Redis fails here we perform a compensating
    // update: mark the PublishingJob STUCK and revert the Post to APPROVED
    // so the user sees an actionable 503 instead of a silent orphan.
    try {
      const delay = new Date(post.publishAt!).getTime() - Date.now();
      await instagramPublishQueue!.add(
        "publish-job",
        { jobId: job.id, postId: post.id },
        { delay: Math.max(delay, 0), attempts: 3, backoff: { type: "exponential", delay: 60000 } }
      );
      console.log(`[PlannerService] Job ${job.id} enqueued successfully (delay: ${Math.max(new Date(post.publishAt!).getTime() - Date.now(), 0)}ms).`);
    } catch (enqueueErr: any) {
      console.error(`[PlannerService] BullMQ enqueue failed for job ${job.id}:`, enqueueErr);

      // Compensating update – revert to a consistent, visible state
      await prisma.$transaction([
        prisma.publishingJob.update({
          where: { id: job.id },
          data: {
            status: JobStatus.STUCK,
            lastError: `Enqueue failed: ${enqueueErr.message}`
          }
        }),
        prisma.post.update({
          where: { id },
          data: { status: PostStatus.APPROVED }
        })
      ]);

      // Revert bRoll statuses too
      if (post.brolls && post.brolls.length > 0) {
        await prisma.bRoll.updateMany({
          where: { id: { in: post.brolls.map(b => b.id) } },
          data: { status: "ATTACHED" as any }
        });
      }

      console.warn(`[PlannerService] Job ${job.id} marked STUCK. Post ${post.id} reverted to APPROVED.`);
      throw Object.assign(
        new Error(
          `Scheduling failed: publishing queue is currently unavailable (${enqueueErr.message}). ` +
          "Your post has not been scheduled. Please try again once the issue is resolved."
        ),
        { statusCode: 503 }
      );
    }

    return updatedPost;
  }

  static async getPublishingHistory(userId: string) {
    return prisma.publishingJob.findMany({
      where: { userId },
      include: {
        post: {
          select: { title: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  static async retryPublishingJob(jobId: string, userId: string) {
    const job = await prisma.publishingJob.findUnique({
      where: { id: jobId, userId },
      include: { post: true }
    });
    if (!job) throw Object.assign(new Error("Job not found"), { statusCode: 404 });
    if (job.status !== JobStatus.FAILED && job.status !== JobStatus.STUCK) {
      throw Object.assign(new Error("Only FAILED or STUCK jobs can be retried"), { statusCode: 400 });
    }

    // Validate queue health before retry
    await PlannerService.assertQueueHealthy();

    // Reset attempts and set to PENDING
    const updatedJob = await prisma.publishingJob.update({
      where: { id: jobId },
      data: { status: JobStatus.PENDING, attempts: 0, lastError: null }
    });

    await prisma.post.update({
      where: { id: job.postId },
      data: { status: PostStatus.SCHEDULED }
    });

    if (instagramPublishQueue) {
      await instagramPublishQueue.add(
        "publish-job",
        { jobId: job.id, postId: job.postId },
        { delay: 0, attempts: 3, backoff: { type: "exponential", delay: 60000 } }
      );
    }
    return updatedJob;
  }
}
