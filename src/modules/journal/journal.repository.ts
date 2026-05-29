import { prisma } from "../../config/db";
import { CreateJournalEntryInput, UpdateJournalEntryInput } from "./journal.types";

export class JournalRepository {
  static async findMany(userId: string) {
    return prisma.journalEntry.findMany({
      where: { userId },
      orderBy: { weekStart: "desc" },
    });
  }

  static async findById(id: string, userId: string) {
    return prisma.journalEntry.findFirst({
      where: { id, userId },
    });
  }

  static async create(userId: string, data: CreateJournalEntryInput) {
    return prisma.journalEntry.create({
      data: {
        weekStart: data.weekStart,
        mood: data.mood,
        followers: data.followers ?? 0,
        posts: data.posts ?? 0,
        reach: data.reach ?? 0,
        saves: data.saves ?? 0,
        engagement: data.engagement ?? "0",
        reflection: data.reflection,
        wins: data.wins,
        lessons: data.lessons,
        notes: data.notes,
        userId,
      },
    });
  }

  static async update(id: string, userId: string, data: UpdateJournalEntryInput) {
    const updateData: any = {};
    if (data.weekStart !== undefined) updateData.weekStart = data.weekStart;
    if (data.mood !== undefined) updateData.mood = data.mood;
    if (data.followers !== undefined) updateData.followers = data.followers;
    if (data.posts !== undefined) updateData.posts = data.posts;
    if (data.reach !== undefined) updateData.reach = data.reach;
    if (data.saves !== undefined) updateData.saves = data.saves;
    if (data.engagement !== undefined) updateData.engagement = data.engagement;
    if (data.reflection !== undefined) updateData.reflection = data.reflection;
    if (data.wins !== undefined) updateData.wins = data.wins;
    if (data.lessons !== undefined) updateData.lessons = data.lessons;
    if (data.notes !== undefined) updateData.notes = data.notes;

    return prisma.journalEntry.update({
      where: { id },
      data: updateData,
    });
  }

  static async delete(id: string, userId: string) {
    return prisma.journalEntry.deleteMany({
      where: { id, userId },
    });
  }
}
