import assert from "node:assert/strict";
import { once } from "node:events";
import { test } from "node:test";
import { createHealthServer } from "./server.js";

test("GET /health returns service status", async () => {
  const server = createHealthServer();
  server.listen(0, "127.0.0.1");
  await once(server, "listening");

  try {
    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Expected a TCP address");
    }

    const response = await fetch(`http://127.0.0.1:${address.port}/health`);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.status, "ok");
    assert.equal(body.service, "health-demo");
    assert.equal(typeof body.uptimeSeconds, "number");
    assert.ok(!Number.isNaN(Date.parse(body.timestamp)));

    const missing = await fetch(`http://127.0.0.1:${address.port}/missing`);
    assert.equal(missing.status, 404);
  } finally {
    server.close();
    await once(server, "close");
  }
});
