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

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        status: PostStatus.SCHEDULED,
        scheduledAt: new Date(),
        scheduledByUserId: userId
      }
    });

    if (post.brolls && post.brolls.length > 0) {
      await prisma.bRoll.updateMany({
        where: { id: { in: post.brolls.map(b => b.id) } },
        data: { status: "SCHEDULED" as any }
      });
    }

    const job = await prisma.publishingJob.create({
      data: {
        postId: post.id,
        userId: user.id,
        publishAt: post.publishAt,
        status: JobStatus.PENDING
      }
    });

    if (instagramPublishQueue) {
      const delay = new Date(post.publishAt).getTime() - Date.now();
      await instagramPublishQueue.add(
        "publish-job",
        { jobId: job.id, postId: post.id },
        { delay: Math.max(delay, 0), attempts: 3, backoff: { type: "exponential", delay: 60000 } }
      );
    } else {
      console.warn(`[PlannerService] instagramPublishQueue is not initialized. Job ${job.id} will not be enqueued automatically.`);
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
    if (job.status !== JobStatus.FAILED) {
      throw Object.assign(new Error("Only FAILED jobs can be retried"), { statusCode: 400 });
    }

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
