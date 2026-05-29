import { z } from "zod";

export const GetJobSchema = z.object({
  id: z.string().uuid(),
});
