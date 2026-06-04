import { prisma } from "../../config/db";
import { CreateBRollInput, UpdateBRollInput } from "./broll.types";

export class BRollRepository {
  static async findMany(userId: string) {
    const records = await prisma.bRoll.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    });
    return records.map(r => ({
      ...r,
      visualTags: JSON.parse(r.visualTags || "[]") as string[],
      emotionTags: JSON.parse(r.emotionTags || "[]") as string[],
    }));
  }

  static async findById(id: string, userId: string) {
    const record = await prisma.bRoll.findFirst({
      where: { id, userId },
    });
    if (!record) return null;
    return {
      ...record,
      visualTags: JSON.parse(record.visualTags || "[]") as string[],
      emotionTags: JSON.parse(record.emotionTags || "[]") as string[],
    };
  }

  static async create(userId: string, data: CreateBRollInput) {
    const record = await prisma.bRoll.create({
      data: {
        title: data.title,
        description: data.description,
        mood: data.mood,
        visualTags: JSON.stringify(data.visualTags || []),
        emotionTags: JSON.stringify(data.emotionTags || []),
        location: data.location,
        lighting: data.lighting,
        motionType: data.motionType,
        audioFeeling: data.audioFeeling,
        timeOfDay: data.timeOfDay,
        weather: data.weather,
        clipType: data.clipType || "video",
        cinematicUse: data.cinematicUse,
        energy: data.energy || "soft",
        notes: data.notes,
        fileUrl: data.fileUrl,
        thumbnailUrl: data.thumbnailUrl,
        favorite: data.favorite ?? false,
        status: data.status,
        duration: data.duration,
        fileSize: data.fileSize,
        resolution: data.resolution,
        mimeType: data.mimeType,
        userId,
      },
    });
    return {
      ...record,
      visualTags: JSON.parse(record.visualTags || "[]") as string[],
      emotionTags: JSON.parse(record.emotionTags || "[]") as string[],
    };
  }

  static async update(id: string, userId: string, data: UpdateBRollInput) {
    const existing = await prisma.bRoll.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      const err: any = new Error("B-Roll clip not found");
      err.statusCode = 404;
      throw err;
    }

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title;
    if (data.description !== undefined) updateData.description = data.description;
    if (data.mood !== undefined) updateData.mood = data.mood;
    if (data.visualTags !== undefined) updateData.visualTags = JSON.stringify(data.visualTags);
    if (data.emotionTags !== undefined) updateData.emotionTags = JSON.stringify(data.emotionTags);
    if (data.location !== undefined) updateData.location = data.location;
    if (data.lighting !== undefined) updateData.lighting = data.lighting;
    if (data.motionType !== undefined) updateData.motionType = data.motionType;
    if (data.audioFeeling !== undefined) updateData.audioFeeling = data.audioFeeling;
    if (data.timeOfDay !== undefined) updateData.timeOfDay = data.timeOfDay;
    if (data.weather !== undefined) updateData.weather = data.weather;
    if (data.clipType !== undefined) updateData.clipType = data.clipType;
    if (data.cinematicUse !== undefined) updateData.cinematicUse = data.cinematicUse;
    if (data.energy !== undefined) updateData.energy = data.energy;
    if (data.notes !== undefined) updateData.notes = data.notes;
    if (data.fileUrl !== undefined) updateData.fileUrl = data.fileUrl;
    if (data.thumbnailUrl !== undefined) updateData.thumbnailUrl = data.thumbnailUrl;
    if (data.favorite !== undefined) updateData.favorite = data.favorite;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.duration !== undefined) updateData.duration = data.duration;
    if (data.fileSize !== undefined) updateData.fileSize = data.fileSize;
    if (data.resolution !== undefined) updateData.resolution = data.resolution;
    if (data.mimeType !== undefined) updateData.mimeType = data.mimeType;

    const record = await prisma.bRoll.update({
      where: { id },
      data: updateData,
    });

    return {
      ...record,
      visualTags: JSON.parse(record.visualTags || "[]") as string[],
      emotionTags: JSON.parse(record.emotionTags || "[]") as string[],
    };
  }

  static async delete(id: string, userId: string) {
    const result = await prisma.bRoll.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) {
      const err: any = new Error("B-Roll clip not found");
      err.statusCode = 404;
      throw err;
    }
    return result;
  }
}
