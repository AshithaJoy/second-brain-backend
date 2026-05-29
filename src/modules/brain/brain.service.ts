import { BrainRepository } from "./brain.repository";
import { CreateDumpInput, UpdateDumpInput } from "./brain.types";
import { AIRepository } from "../ai/ai.repository";
import { AuthRepository } from "../auth/auth.repository";
import { rewriteDumpQueue } from "../../config/queues";
import { safeEnqueue } from "../../utils/queue";

export class BrainService {
  static async getDumps(userId: string) {
    return BrainRepository.findMany(userId);
  }

  static async getDumpById(id: string, userId: string) {
    const dump = await BrainRepository.findById(id, userId);
    if (!dump) {
      const err: any = new Error("Dump not found");
      err.statusCode = 404;
      throw err;
    }
    return dump;
  }

  static async createDump(userId: string, data: CreateDumpInput) {
    return BrainRepository.create(userId, data);
  }

  static async updateDump(id: string, userId: string, data: UpdateDumpInput) {
    await this.getDumpById(id, userId);
    return BrainRepository.update(id, userId, data);
  }

  static async deleteDump(id: string, userId: string) {
    await this.getDumpById(id, userId);
    return BrainRepository.delete(id, userId);
  }

  static async rewriteDump(dumpId: string, userId: string) {
    const dump = await this.getDumpById(dumpId, userId);
    
    // Check and deduct credits first
    await AuthRepository.checkAndDecrementCredits(userId);

    // Create tracking AIJob
    const job = await AIRepository.createJob(userId, "rewrite-dump");

    // Enqueue job safely
    await safeEnqueue(
      rewriteDumpQueue,
      `rewrite-dump-${job.id}`,
      {
        dumpId: dump.id,
        title: dump.title,
        text: dump.text,
        userId,
        jobId: job.id,
      },
      { jobId: job.id }
    );

    return job;
  }
}
