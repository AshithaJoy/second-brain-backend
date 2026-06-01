import { z } from "zod";

export const ConnectInstagramSchema = z.object({
  accessToken: z.string().min(1, "Access token is required"),
});
