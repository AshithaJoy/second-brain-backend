import { CollabsRepository } from "./collabs.repository";
import { CreateCollabInput, UpdateCollabInput } from "./collabs.types";
import { AIRepository } from "../ai/ai.repository";
import { generatePitchQueue, scanBrandQueue } from "../../config/queues";
import { safeEnqueue } from "../../utils/queue";

export class CollabsService {
  static async getCollabs(userId: string) {
    return CollabsRepository.findMany(userId);
  }

  static async getCollabById(id: string, userId: string) {
    const collab = await CollabsRepository.findById(id, userId);
    if (!collab) {
      const err: any = new Error("Collab not found");
      err.statusCode = 404;
      throw err;
    }
    return collab;
  }

  static async createCollab(userId: string, data: CreateCollabInput) {
    return CollabsRepository.create(userId, data);
  }

  static async updateCollab(id: string, userId: string, data: UpdateCollabInput) {
    await this.getCollabById(id, userId);
    return CollabsRepository.update(id, userId, data);
  }

  static async deleteCollab(id: string, userId: string) {
    await this.getCollabById(id, userId);
    return CollabsRepository.delete(id, userId);
  }

  static async estimateCollab(
    collabId: string,
    brandName: string,
    profileUrl: string,
    niche: string,
    userId: string
  ) {
    // Verify collab belongs to the user
    await this.getCollabById(collabId, userId);

    // Create AI Job
    const job = await AIRepository.createJob(userId, "generate-pitch");

    // Add safely
    await safeEnqueue(
      generatePitchQueue,
      `generate-pitch-${job.id}`,
      {
        collabId,
        brandName,
        profileUrl,
        niche,
        userId,
        jobId: job.id,
      },
      { jobId: job.id }
    );

    return job;
  }

  static async discoverBrands(niche: string, userId: string) {
    // Create AI Job
    const job = await AIRepository.createJob(userId, "scan-brand");

    // Add safely
    await safeEnqueue(
      scanBrandQueue,
      `scan-brand-${job.id}`,
      {
        niche,
        userId,
        jobId: job.id,
      },
      { jobId: job.id }
    );

    return job;
  }
}
