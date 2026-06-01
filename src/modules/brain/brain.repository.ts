import { prisma } from "../../config/db";
import { CreateDumpInput, UpdateDumpInput } from "./brain.types";

export class BrainRepository {
  static async findMany(userId: string) {
    return prisma.dump.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
  }

  static async findById(id: string, userId: string) {
    return prisma.dump.findFirst({
      where: { id, userId },
    });
  }

  static async create(userId: string, data: CreateDumpInput) {
    return prisma.dump.create({
      data: {
        title: data.title,
        text: data.text,
        mood: data.mood,
        ts: data.ts,
        archived: data.archived ?? false,
        userId,
      },
    });
  }

  static async update(id: string, userId: string, data: UpdateDumpInput) {
    const existing = await prisma.dump.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      const err: any = new Error("Dump not found");
      err.statusCode = 404;
      throw err;
    }
    return prisma.dump.update({
      where: { id },
      data: {
        title: data.title,
        text: data.text,
        mood: data.mood,
        ts: data.ts,
        archived: data.archived,
      },
    });
  }

  static async delete(id: string, userId: string) {
    const result = await prisma.dump.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) {
      const err: any = new Error("Dump not found");
      err.statusCode = 404;
      throw err;
    }
    return result;
  }
}
