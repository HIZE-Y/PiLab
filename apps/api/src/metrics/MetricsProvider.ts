import type { SystemMetrics } from "@pilab/shared";

export interface MetricsProvider {
  getCurrentMetrics(): Promise<SystemMetrics>;
}
