import { z } from "zod";

export const HealthDemoResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.literal("health-demo"),
  uptimeSeconds: z.number().int().nonnegative(),
  timestamp: z.iso.datetime()
});

export const ServiceStatusSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  status: z.enum(["online", "offline"]),
  uptimeSeconds: z.number().int().nonnegative().nullable(),
  checkedAt: z.iso.datetime()
});

export const ServicesResponseSchema = z.object({
  services: z.array(ServiceStatusSchema)
});

export type ServiceStatus = z.infer<typeof ServiceStatusSchema>;
