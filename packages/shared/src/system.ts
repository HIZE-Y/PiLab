import { z } from "zod";

export const SystemStatusSchema = z.object({
  shutdownEnabled: z.boolean()
});

export type SystemStatus = z.infer<typeof SystemStatusSchema>;
