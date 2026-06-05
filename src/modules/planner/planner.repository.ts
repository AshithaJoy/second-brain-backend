import { prisma } from "../../config/db";
import { CreatePostInput, UpdatePostInput } from "./planner.types";

export class PlannerRepository {
  static async findMany(userId: string) {
    return prisma.post.findMany({
      where: { userId },
      orderBy: { date: "asc" },
      include: { shoot: true, brolls: true },
    });
  }

  static async findById(id: string, userId: string) {
    return prisma.post.findFirst({
      where: { id, userId },
      include: { shoot: true, brolls: true },
    });
  }

  static async create(userId: string, data: CreatePostInput & { brollIds?: string[] }) {
    return prisma.post.create({
      data: {
        title: data.title,
        date: data.date,
        type: data.type,
        status: data.status,
        mood: data.mood,
        caption: data.caption,
        hashtags: data.hashtags,
        notes: data.notes,
        shootId: data.shootId,
        publishAt: data.publishAt,
        userId,
        ...(data.brollIds && {
          brolls: {
            connect: data.brollIds.map(id => ({ id }))
          }
        })
      },
      include: { shoot: true, brolls: true },
    });
  }

  static async update(id: string, userId: string, data: UpdatePostInput & { brollIds?: string[] }) {
    const existing = await prisma.post.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      const err: any = new Error("Post not found");
      err.statusCode = 404;
      throw err;
    }
    
    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        title: data.title,
        date: data.date,
        type: data.type,
        status: data.status,
        mood: data.mood,
        caption: data.caption,
        hashtags: data.hashtags,
        notes: data.notes,
        shootId: data.shootId === null ? null : data.shootId,
        publishAt: data.publishAt === null ? null : data.publishAt,
        ...(data.brollIds && {
          brolls: {
            set: data.brollIds.map(bId => ({ id: bId }))
          }
        })
      },
      include: { shoot: true, brolls: true },
    });

    // Asset Lifecycle Automation
    if (updatedPost.brolls && updatedPost.brolls.length > 0) {
      let newAssetStatus = "ATTACHED";
      if (updatedPost.status === "SCHEDULED") newAssetStatus = "SCHEDULED";
      if (updatedPost.status === "PUBLISHED") newAssetStatus = "PUBLISHED";
      if (updatedPost.status === "ARCHIVED") newAssetStatus = "ARCHIVED";

      await prisma.bRoll.updateMany({
        where: { id: { in: updatedPost.brolls.map(b => b.id) } },
        data: { status: newAssetStatus as any }
      });
    }

    return updatedPost;
  }

  static async delete(id: string, userId: string) {
    const result = await prisma.post.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) {
      const err: any = new Error("Post not found");
      err.statusCode = 404;
      throw err;
    }
    return result;
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
    const existing = await prisma.shoot.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      const err: any = new Error("Shoot not found");
      err.statusCode = 404;
      throw err;
    }
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
    const result = await prisma.shoot.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) {
      const err: any = new Error("Shoot not found");
      err.statusCode = 404;
      throw err;
    }
    return result;
  }
}
