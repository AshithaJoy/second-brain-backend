import { prisma } from "../../config/db";

export class ReelsRepository {
  static async findMany(userId: string) {
    return prisma.reelBreakdown.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async findById(id: string, userId: string) {
    return prisma.reelBreakdown.findFirst({
      where: { id, userId },
    });
  }

  static async delete(id: string, userId: string) {
    const result = await prisma.reelBreakdown.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) {
      const err: any = new Error("Reel breakdown not found");
      err.statusCode = 404;
      throw err;
    }
    return result;
  }
}
