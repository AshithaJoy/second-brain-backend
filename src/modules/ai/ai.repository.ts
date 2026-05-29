import { prisma } from "../../config/db";

export class AIRepository {
  static async createJob(userId: string, queueName: string) {
    return prisma.aIJob.create({
      data: {
        userId,
        queueName,
        status: "PENDING",
      },
    });
  }

  static async getJob(id: string) {
    return prisma.aIJob.findUnique({
      where: { id },
    });
  }
}
