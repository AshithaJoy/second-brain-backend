import { prisma } from "../../config/db";
import { CreateCollabInput, UpdateCollabInput } from "./collabs.types";

export class CollabsRepository {
  static async findMany(userId: string) {
    return prisma.collab.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: { deliverables: true },
    });
  }

  static async findById(id: string, userId: string) {
    return prisma.collab.findFirst({
      where: { id, userId },
      include: { deliverables: true },
    });
  }

  static async create(userId: string, data: CreateCollabInput & { deliverables?: any[] }) {
    return prisma.collab.create({
      data: {
        brand: data.brand,
        contactName: data.contactName,
        email: data.email || null,
        platform: data.platform ?? "Instagram",
        status: data.status,
        quote: data.quote ?? 0,
        negotiatedAmount: data.negotiatedAmount ?? 0,
        dueDate: data.dueDate,
        paymentStatus: data.paymentStatus,
        notes: data.notes,
        pitchDraft: data.pitchDraft,
        followUpDraft: data.followUpDraft,
        scriptText: data.scriptText,
        wardrobe: data.wardrobe,
        props: data.props,
        briefFileName: data.briefFileName,
        briefFileUrl: data.briefFileUrl,
        userId,
        deliverables: data.deliverables ? {
          create: data.deliverables.map((d: any) => ({
            text: d.text,
            type: d.type || "custom",
            completed: d.completed ?? false,
            postId: d.postId || null,
            shootId: d.shootId || null,
          })),
        } : undefined,
      },
      include: { deliverables: true },
    });
  }

  static async update(id: string, userId: string, data: UpdateCollabInput & { deliverables?: any[] }) {
    return prisma.$transaction(async (tx) => {
      const existing = await tx.collab.findFirst({
        where: { id, userId },
      });
      if (!existing) {
        const err: any = new Error("Collab not found");
        err.statusCode = 404;
        throw err;
      }
      await tx.collab.update({
        where: { id },
        data: {
          brand: data.brand,
          contactName: data.contactName,
          email: data.email === "" ? null : data.email,
          platform: data.platform,
          status: data.status,
          quote: data.quote,
          negotiatedAmount: data.negotiatedAmount,
          dueDate: data.dueDate,
          paymentStatus: data.paymentStatus,
          notes: data.notes,
          pitchDraft: data.pitchDraft,
          followUpDraft: data.followUpDraft,
          scriptText: data.scriptText,
          wardrobe: data.wardrobe,
          props: data.props,
          briefFileName: data.briefFileName,
          briefFileUrl: data.briefFileUrl,
        },
      });

      if (data.deliverables) {
        const existingDelivs = await tx.deliverable.findMany({ where: { collabId: id } });
        const existingIds = existingDelivs.map(e => e.id);
        const incomingIds = data.deliverables.map(d => d.id).filter(Boolean);

        const toDelete = existingIds.filter(eid => !incomingIds.includes(eid));
        if (toDelete.length > 0) {
          await tx.deliverable.deleteMany({
            where: { id: { in: toDelete } },
          });
        }

        for (const d of data.deliverables) {
          if (d.id && existingIds.includes(d.id)) {
            await tx.deliverable.update({
              where: { id: d.id },
              data: {
                text: d.text,
                type: d.type || "custom",
                completed: d.completed ?? false,
                postId: d.postId || null,
                shootId: d.shootId || null,
              },
            });
          } else {
            await tx.deliverable.create({
              data: {
                collabId: id,
                text: d.text,
                type: d.type || "custom",
                completed: d.completed ?? false,
                postId: d.postId || null,
                shootId: d.shootId || null,
              },
            });
          }
        }
      }

      return tx.collab.findFirst({
        where: { id, userId },
        include: { deliverables: true },
      });
    }) as any;
  }

  static async delete(id: string, userId: string) {
    const result = await prisma.collab.deleteMany({
      where: { id, userId },
    });
    if (result.count === 0) {
      const err: any = new Error("Collab not found");
      err.statusCode = 404;
      throw err;
    }
    return result;
  }
}
