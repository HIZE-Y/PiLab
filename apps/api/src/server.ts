import { execFile } from "node:child_process";
import { promisify } from "node:util";
import cors from "cors";
import express from "express";
import { createServer } from "node:http";
import { Server as SocketServer } from "socket.io";
import { SystemMetricsSchema, SystemStatusSchema } from "@pilab/shared";
import type { MetricsProvider } from "./metrics/MetricsProvider.js";

const execFileAsync = promisify(execFile);

type ShutdownCommand = () => Promise<void>;

type CreateApiServerOptions = {
  metricsProvider: MetricsProvider;
  dashboardOrigin: string;
  metricsIntervalMs?: number;
  allowSystemShutdown?: boolean;
  shutdownCommand?: ShutdownCommand;
};

async function defaultShutdownCommand() {
  await execFileAsync("sudo", ["shutdown", "now"]);
}

export function createApiServer({
  metricsProvider,
  dashboardOrigin,
  metricsIntervalMs = 2000,
  allowSystemShutdown = false,
  shutdownCommand = defaultShutdownCommand
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

  app.get("/api/system", (_request, response) => {
    response.json(
      SystemStatusSchema.parse({
        shutdownEnabled: allowSystemShutdown
      })
    );
  });

  app.post("/api/system/shutdown", async (_request, response, next) => {
    if (!allowSystemShutdown) {
      response.status(403).json({
        message: "System shutdown is disabled. Set ALLOW_SYSTEM_SHUTDOWN=true to enable it."
      });
      return;
    }

    try {
      await shutdownCommand();
      response.status(202).json({ message: "Shutdown requested" });
    } catch (error) {
      next(error);
    }
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
