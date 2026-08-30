import { z } from "zod";

export const SystemMetricsSchema = z.object({
  timestamp: z.string().datetime(),
  cpuUsagePercent: z.number().min(0).max(100),
  cpuTemperatureCelsius: z.number(),
  ramUsagePercent: z.number().min(0).max(100),
  diskUsagePercent: z.number().min(0).max(100),
  uptimeSeconds: z.number().min(0),
  networkRxBytesPerSecond: z.number().min(0),
  networkTxBytesPerSecond: z.number().min(0)
});

export type SystemMetrics = z.infer<typeof SystemMetricsSchema>;

export const MetricsHistorySchema = z.array(SystemMetricsSchema);

export type MetricsHistory = z.infer<typeof MetricsHistorySchema>;
