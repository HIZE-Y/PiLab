import type { SystemMetrics } from "@pilab/shared";
import type { MetricsProvider } from "./MetricsProvider.js";

export class RaspberryPiMetricsProvider implements MetricsProvider {
  async getCurrentMetrics(): Promise<SystemMetrics> {
    throw new Error(
      "RaspberryPiMetricsProvider is planned for real Raspberry Pi hardware. Use SimulatedMetricsProvider for local development."
    );
  }
}
