import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import { SystemMetricsSchema } from "@pilab/shared";
import type { MetricsProvider } from "./metrics/MetricsProvider.js";

type CreateApiServerOptions = {
  metricsProvider: MetricsProvider;
  dashboardOrigin: string;
  metricsIntervalMs?: number;
};

export function createApiServer({
  metricsProvider,
  dashboardOrigin,
  metricsIntervalMs = 2000
}: CreateApiServerOptions) {
  const app = express();
  const httpServer = createServer(app);
  const io = new SocketServer(httpServer, {
    cors: {
      origin: dashboardOrigin
    }
  });

  app.use(cors({ origin: dashboardOrigin }));
  app.use(express.json());

  app.get("/api/health", (_request, response) => {
    response.json({
      status: "ok",
      service: "pilab-api",
      timestamp: new Date().toISOString()
    });
  });

  app.get("/api/metrics", async (_request, response, next) => {
    try {
      const metrics = await metricsProvider.getCurrentMetrics();
      response.json(SystemMetricsSchema.parse(metrics));
    } catch (error) {
      next(error);
    }
  });

  io.on("connection", async (socket) => {
    try {
      const metrics = await metricsProvider.getCurrentMetrics();
      socket.emit("metrics:update", SystemMetricsSchema.parse(metrics));
    } catch {
      socket.emit("metrics:error", { message: "Unable to read metrics" });
    }
  });

  const interval = setInterval(async () => {
    try {
      const metrics = await metricsProvider.getCurrentMetrics();
      io.emit("metrics:update", SystemMetricsSchema.parse(metrics));
    } catch {
      io.emit("metrics:error", { message: "Unable to read metrics" });
    }
  }, metricsIntervalMs);

  interval.unref();

  return {
    app,
    httpServer,
    io,
    start(port: number) {
      httpServer.listen(port, () => {
        console.log(`PiLab API listening on http://localhost:${port}`);
      });
    },
    stop() {
      clearInterval(interval);
      io.close();
      httpServer.close();
    }
  };
}
