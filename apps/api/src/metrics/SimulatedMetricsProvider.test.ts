import { SystemMetricsSchema } from "@pilab/shared";
import { describe, expect, it } from "vitest";
import { SimulatedMetricsProvider } from "./SimulatedMetricsProvider.js";

describe("SimulatedMetricsProvider", () => {
  it("returns valid system metrics", async () => {
    const provider = new SimulatedMetricsProvider();

    const metrics = await provider.getCurrentMetrics();

    expect(SystemMetricsSchema.parse(metrics)).toEqual(metrics);
  });

  it("keeps percentage metrics inside valid ranges", async () => {
    const provider = new SimulatedMetricsProvider();

    for (let index = 0; index < 10; index += 1) {
      const metrics = await provider.getCurrentMetrics();

      expect(metrics.cpuUsagePercent).toBeGreaterThanOrEqual(0);
      expect(metrics.cpuUsagePercent).toBeLessThanOrEqual(100);
      expect(metrics.ramUsagePercent).toBeGreaterThanOrEqual(0);
      expect(metrics.ramUsagePercent).toBeLessThanOrEqual(100);
      expect(metrics.diskUsagePercent).toBeGreaterThanOrEqual(0);
      expect(metrics.diskUsagePercent).toBeLessThanOrEqual(100);
    }
  });
});
