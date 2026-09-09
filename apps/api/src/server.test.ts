import { SystemMetricsSchema } from "@pilab/shared";
import type { SystemMetrics } from "@pilab/shared";
import request from "supertest";
import { describe, expect, it } from "vitest";
import type { MetricsProvider } from "./metrics/MetricsProvider.js";
import { createApiServer } from "./server.js";

const sampleMetrics: SystemMetrics = {
  timestamp: "2026-01-01T00:00:00.000Z",
  cpuUsagePercent: 42,
  cpuTemperatureCelsius: 55.5,
  ramUsagePercent: 61,
  diskUsagePercent: 37,
  uptimeSeconds: 120,
  networkRxBytesPerSecond: 150000,
  networkTxBytesPerSecond: 80000
};

class StaticMetricsProvider implements MetricsProvider {
  async getCurrentMetrics(): Promise<SystemMetrics> {
    return sampleMetrics;
  }
}

describe("createApiServer", () => {
  const apiServer = createApiServer({
    metricsProvider: new StaticMetricsProvider(),
    dashboardOrigin: "http://localhost:5173"
  });

  it("returns health status", async () => {
    const response = await request(apiServer.app).get("/api/health").expect(200);

    expect(response.body).toMatchObject({
      status: "ok",
      service: "pilab-api"
    });
    expect(new Date(response.body.timestamp).toString()).not.toBe("Invalid Date");
  });

  it("returns validated metrics", async () => {
    const response = await request(apiServer.app).get("/api/metrics").expect(200);

    expect(SystemMetricsSchema.parse(response.body)).toEqual(sampleMetrics);
  });
});
