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
  let metricsInterval: NodeJS.Timeout | undefined;

  async function emitMetricsUpdate() {
    try {
      const metrics = await metricsProvider.getCurrentMetrics();
      io.emit("metrics:update", SystemMetricsSchema.parse(metrics));
    } catch {
      io.emit("metrics:error", { message: "Unable to read metrics" });
    }
  }

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

  return {
    app,
    httpServer,
    io,
    start(port: number) {
      metricsInterval ??= setInterval(emitMetricsUpdate, metricsIntervalMs);
      metricsInterval.unref();

      httpServer.listen(port, () => {
        console.log(`PiLab API listening on http://localhost:${port}`);
      });
    },
    stop() {
      if (metricsInterval) {
        clearInterval(metricsInterval);
        metricsInterval = undefined;
      }

      io.close();
      httpServer.close();
    }
  };
}
