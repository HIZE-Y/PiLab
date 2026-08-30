import { SimulatedMetricsProvider } from "./metrics/SimulatedMetricsProvider.js";
import { createApiServer } from "./server.js";

const port = Number(process.env.API_PORT ?? 4000);
const dashboardOrigin = process.env.DASHBOARD_ORIGIN ?? "http://localhost:5173";

const metricsProvider = new SimulatedMetricsProvider();
const server = createApiServer({
  metricsProvider,
  dashboardOrigin
});

server.start(port);
