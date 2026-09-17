import { createHealthServer } from "./server.js";

const port = Number(process.env.HEALTH_PORT ?? 4100);

createHealthServer().listen(port, () => {
  console.log(`Health Demo listening on http://localhost:${port}`);
});
