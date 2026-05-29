import { PlannerRepository } from "./planner.repository";
import { CreatePostInput, UpdatePostInput } from "./planner.types";
import { AIRepository } from "../ai/ai.repository";
import { AuthRepository } from "../auth/auth.repository";
import { generateHooksQueue, generateCaptionsQueue } from "../../config/queues";
import { safeEnqueue } from "../../utils/queue";

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
}
