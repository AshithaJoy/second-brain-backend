import { CollabStatus, PaymentStatus } from "@prisma/client";

export interface CreateCollabInput {
  brand: string;
  contactName?: string | null;
  email?: string | null;
  platform?: string;
  status?: CollabStatus;
  quote?: number;
  negotiatedAmount?: number;
  dueDate?: string | null;
  paymentStatus?: PaymentStatus;
  notes?: string | null;
  pitchDraft?: string | null;
  followUpDraft?: string | null;
  scriptText?: string | null;
  wardrobe?: string | null;
  props?: string | null;
  briefFileName?: string | null;
  briefFileUrl?: string | null;
}

export interface UpdateCollabInput {
  brand?: string;
  contactName?: string | null;
  email?: string | null;
  platform?: string;
  status?: CollabStatus;
  quote?: number;
  negotiatedAmount?: number;
  dueDate?: string | null;
  paymentStatus?: PaymentStatus;
  notes?: string | null;
  pitchDraft?: string | null;
  followUpDraft?: string | null;
  scriptText?: string | null;
  wardrobe?: string | null;
  props?: string | null;
  briefFileName?: string | null;
  briefFileUrl?: string | null;
}
