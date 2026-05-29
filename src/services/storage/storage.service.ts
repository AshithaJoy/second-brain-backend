import { prisma } from "../../config/db";

export const StorageService = prisma;
export type StorageClient = typeof prisma;
