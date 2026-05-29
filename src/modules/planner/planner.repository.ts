import { prisma } from "../../config/db";
import { CreatePostInput, UpdatePostInput } from "./planner.types";

export class PlannerRepository {
  static async findMany(userId: string) {
    return prisma.post.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      include: { shoot: true },
    });
  }

  static async findById(id: string, userId: string) {
    return prisma.post.findFirst({
      where: { id, userId },
      include: { shoot: true },
    });
  }

  static async create(userId: string, data: CreatePostInput) {
    return prisma.post.create({
      data: {
        title: data.title,
        date: data.date,
        type: data.type,
        status: data.status,
        mood: data.mood,
        caption: data.caption,
        hashtags: data.hashtags,
        shootId: data.shootId,
        userId,
      },
      include: { shoot: true },
    });
  }

  static async update(id: string, userId: string, data: UpdatePostInput) {
    // If shootId is provided as null/undefined, we might need special handling depending on Prisma
    return prisma.post.update({
      where: { id },
      data: {
        title: data.title,
        date: data.date,
        type: data.type,
        status: data.status,
        mood: data.mood,
        caption: data.caption,
        hashtags: data.hashtags,
        shootId: data.shootId === null ? null : data.shootId,
      },
      include: { shoot: true },
    });
  }

  static async delete(id: string, userId: string) {
    return prisma.post.deleteMany({
      where: { id, userId },
    });
  }

  static async findManyShoots(userId: string) {
    return prisma.shoot.findMany({
      where: { userId },
      orderBy: { shootDate: "asc" },
      include: { post: true },
    });
  }

  static async findShootById(id: string, userId: string) {
    return prisma.shoot.findFirst({
      where: { id, userId },
      include: { post: true },
    });
  }

  static async createShoot(userId: string, data: any) {
    return prisma.shoot.create({
      data: {
        name: data.name,
        shootDate: data.shootDate,
        slotsJson: data.slotsJson,
        postId: data.postId || null,
        userId,
      },
      include: { post: true },
    });
  }

  static async updateShoot(id: string, userId: string, data: any) {
    return prisma.shoot.update({
      where: { id },
      data: {
        name: data.name,
        shootDate: data.shootDate,
        slotsJson: data.slotsJson,
        postId: data.postId === null ? null : data.postId,
      },
      include: { post: true },
    });
  }

  static async deleteShoot(id: string, userId: string) {
    return prisma.shoot.deleteMany({
      where: { id, userId },
    });
  }
}
