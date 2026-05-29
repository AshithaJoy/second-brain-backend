import { z } from "zod";
import { CollabStatus, PaymentStatus } from "@prisma/client";

export const CreateCollabSchema = z.object({
  brand: z.string().min(1),
  contactName: z.string().nullable().optional(),
  email: z.string().email().nullable().or(z.literal("")).optional(),
  platform: z.string().optional(),
  status: z.nativeEnum(CollabStatus).optional(),
  quote: z.number().int().nonnegative().optional(),
  negotiatedAmount: z.number().int().nonnegative().optional(),
  dueDate: z.string().nullable().optional(),
  paymentStatus: z.nativeEnum(PaymentStatus).optional(),
  notes: z.string().nullable().optional(),
  pitchDraft: z.string().nullable().optional(),
  followUpDraft: z.string().nullable().optional(),
  scriptText: z.string().nullable().optional(),
  wardrobe: z.string().nullable().optional(),
  props: z.string().nullable().optional(),
  briefFileName: z.string().nullable().optional(),
  briefFileUrl: z.string().nullable().optional(),
  deliverables: z.array(z.object({
    id: z.string().uuid().optional(),
    text: z.string().min(1),
    type: z.string().optional(),
    completed: z.boolean().optional(),
    postId: z.string().uuid().nullable().optional(),
    shootId: z.string().uuid().nullable().optional(),
  })).optional(),
});

export const UpdateCollabSchema = CreateCollabSchema.partial();

export const CollabIdSchema = z.object({
  id: z.string().uuid(),
});

export const EstimateCollabSchema = z.object({
  collabId: z.string().uuid(),
  brandName: z.string().min(1),
  profileUrl: z.string().url(),
  niche: z.string().min(1),
});

export const DiscoverBrandsSchema = z.object({
  niche: z.string().min(1),
});
