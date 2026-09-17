import { ServicesResponseSchema, SystemMetricsSchema, SystemStatusSchema } from "@pilab/shared";
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

  it("reports a healthy service", async () => {
    const server = createApiServer({
      metricsProvider: new StaticMetricsProvider(),
      dashboardOrigin: "http://localhost:5173",
      serviceFetch: async () => new Response(JSON.stringify({
        status: "ok",
        service: "health-demo",
        uptimeSeconds: 62,
        timestamp: "2026-01-01T00:00:00.000Z"
      }), { status: 200 })
    });

    const response = await request(server.app).get("/api/services").expect(200);
    const { services } = ServicesResponseSchema.parse(response.body);
    expect(services[0]).toMatchObject({
      id: "health-demo",
      status: "online",
      uptimeSeconds: 62
    });
  });

  it("reports a stopped service as offline", async () => {
    const server = createApiServer({
      metricsProvider: new StaticMetricsProvider(),
      dashboardOrigin: "http://localhost:5173",
      serviceFetch: async () => { throw new Error("Connection refused"); }
    });

    const response = await request(server.app).get("/api/services").expect(200);
    const { services } = ServicesResponseSchema.parse(response.body);
    expect(services[0]).toMatchObject({
      id: "health-demo",
      status: "offline",
      uptimeSeconds: null
    });
  });

  it("reports an invalid health response as offline", async () => {
    const server = createApiServer({
      metricsProvider: new StaticMetricsProvider(),
      dashboardOrigin: "http://localhost:5173",
      serviceFetch: async () => new Response(JSON.stringify({ status: "ok" }), { status: 200 })
    });

    const response = await request(server.app).get("/api/services").expect(200);
    const { services } = ServicesResponseSchema.parse(response.body);
    expect(services[0].status).toBe("offline");
  });

  it("reports shutdown as disabled by default", async () => {
    const response = await request(apiServer.app).get("/api/system").expect(200);

    expect(SystemStatusSchema.parse(response.body)).toEqual({
      shutdownEnabled: false
    });
  });

  it("rejects shutdown when shutdown is disabled", async () => {
    await request(apiServer.app).post("/api/system/shutdown").expect(403);
  });

  it("runs the shutdown command when shutdown is enabled", async () => {
    let shutdownRequested = false;
    const enabledServer = createApiServer({
      metricsProvider: new StaticMetricsProvider(),
      dashboardOrigin: "http://localhost:5173",
      allowSystemShutdown: true,
      shutdownCommand: async () => {
        shutdownRequested = true;
      }
    });

    await request(enabledServer.app).post("/api/system/shutdown").expect(202);

    expect(shutdownRequested).toBe(true);
  });
});
