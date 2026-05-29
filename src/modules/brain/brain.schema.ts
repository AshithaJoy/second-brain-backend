import { z } from "zod";

export const CreateDumpSchema = z.object({
  title: z.string().min(1),
  text: z.string(),
  mood: z.string(),
  ts: z.string(),
  archived: z.boolean().optional(),
});

export const UpdateDumpSchema = CreateDumpSchema.partial();

export const DumpIdSchema = z.object({
  id: z.string().uuid(),
});

export const RewriteDumpSchema = z.object({
  dumpId: z.string().uuid(),
});
