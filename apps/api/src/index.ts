import "dotenv/config";
import { fileURLToPath } from "node:url";
import { RaspberryPiMetricsProvider } from "./metrics/RaspberryPiMetricsProvider.js";
import { SimulatedMetricsProvider } from "./metrics/SimulatedMetricsProvider.js";
import { createApiServer } from "./server.js";
import type { MetricsProvider } from "./metrics/MetricsProvider.js";

const port = Number(process.env.API_PORT ?? 4000);
const dashboardOrigin = process.env.DASHBOARD_ORIGIN ?? "http://localhost:5173";
const metricsProviderName = process.env.METRICS_PROVIDER ?? "simulated";
const allowSystemShutdown = process.env.ALLOW_SYSTEM_SHUTDOWN === "true";
const dashboardDirectory =
  process.env.NODE_ENV === "production"
    ? fileURLToPath(new URL("../../dashboard/dist/", import.meta.url))
    : undefined;

function createMetricsProvider(): MetricsProvider {
  if (metricsProviderName === "raspberry-pi") {
    return new RaspberryPiMetricsProvider();
  }

  if (metricsProviderName !== "simulated") {
    throw new Error(
      `Unsupported METRICS_PROVIDER value: ${metricsProviderName}. Use simulated or raspberry-pi.`
    );
  }

  return new SimulatedMetricsProvider();
}

const metricsProvider = createMetricsProvider();
const server = createApiServer({
  metricsProvider,
  dashboardOrigin,
  dashboardDirectory,
  allowSystemShutdown
});

server.start(port);
