import { AIRepository } from "./ai.repository";

export class AIService {
  static async getJobStatus(id: string, userId: string) {
    const job = await AIRepository.getJob(id, userId);
    if (!job) {
      const err: any = new Error("Job not found");
      err.statusCode = 404;
      throw err;
    }
    return job;
  }
}
