# PiLab

PiLab is a home-lab monitoring dashboard designed for a Raspberry Pi 4. The current MVP runs locally and uses simulated Raspberry Pi metrics, so development can continue before the Raspberry Pi microSD card is available.

The project is built as a small TypeScript monorepo with a backend API, a React dashboard, and shared runtime-validated metric types.

## Features

- Live dashboard for simulated Raspberry Pi metrics
- REST API health and metrics endpoints
- Socket.IO real-time metric updates every two seconds
- Current metric cards for CPU, temperature, RAM, disk, uptime, and network activity
- Online/offline connection status
- Warning styles for high CPU, temperature, RAM, and disk usage
- Recent-history chart for CPU, RAM, and temperature
- Shared Zod schemas and TypeScript types
- Provider-based metrics architecture for replacing simulated metrics later
- Basic backend tests
- Dockerfiles for API and dashboard
- Root Docker Compose setup

## Tech Stack

| Area | Technology |
| --- | --- |
| Monorepo | pnpm workspaces |
| Backend | Node.js, TypeScript, Express |
| Real-time | Socket.IO |
| Frontend | React, TypeScript, Vite |
| Charts | Recharts |
| Validation | Zod |
| Tests | Vitest, Supertest |
| Containers | Docker, Docker Compose |

## Project Structure

```text
apps/
  api/          Backend API and metrics providers
  dashboard/    React dashboard
packages/
  shared/       Shared Zod schemas and TypeScript types
```

## Architecture

The backend reads metrics through a provider interface:

```ts
interface MetricsProvider {
  getCurrentMetrics(): Promise<SystemMetrics>;
}
```

The current implementation is:

```text
SimulatedMetricsProvider
```

It generates realistic fake Raspberry Pi metrics locally. The future hardware implementation is already represented in code as a placeholder:

```text
RaspberryPiMetricsProvider
```

That placeholder intentionally throws for now because real Raspberry Pi system reads should be added only when the app is running on the Pi.

Because the API depends on the `MetricsProvider` interface, the dashboard and REST endpoints do not need to change when the source changes from simulated data to real Raspberry Pi data.

## API

### `GET /api/health`

Returns API health status.

Example response:

```json
{
  "status": "ok",
  "service": "pilab-api",
  "timestamp": "2026-01-01T00:00:00.000Z"
}
```

### `GET /api/metrics`

Returns the latest system metrics.

Example response:

```json
{
  "timestamp": "2026-01-01T00:00:00.000Z",
  "cpuUsagePercent": 42,
  "cpuTemperatureCelsius": 55.5,
  "ramUsagePercent": 61,
  "diskUsagePercent": 37,
  "uptimeSeconds": 120,
  "networkRxBytesPerSecond": 150000,
  "networkTxBytesPerSecond": 80000
}
```

## Real-time Events

The API emits this Socket.IO event every two seconds:

```text
metrics:update
```

The payload matches the shared `SystemMetrics` schema from `@pilab/shared`.

## Getting Started

### Prerequisites

- Node.js 22 or newer
- pnpm 11 or newer

### Configure Environment

Create a local environment file from the example:

```bash
cp .env.example .env
```

The default values are ready for local development.

### Install Dependencies

```bash
pnpm install
```

### Run Locally

```bash
pnpm dev
```

Local URLs:

```text
API:       http://localhost:4000
Dashboard: http://localhost:5173
```

API endpoints:

```text
http://localhost:4000/api/health
http://localhost:4000/api/metrics
```

## Scripts

Run all development servers:

```bash
pnpm dev
```

Run all tests:

```bash
pnpm test
```

Build all packages and apps:

```bash
pnpm build
```

Run only the API:

```bash
pnpm --filter @pilab/api dev
```

Run only the dashboard:

```bash
pnpm --filter @pilab/dashboard dev
```

## Docker

Docker files are included for the API and dashboard.

Run both services with Docker Compose:

```bash
docker compose up --build
```

Expected URLs:

```text
API:       http://localhost:4000
Dashboard: http://localhost:5173
```

Docker has not been verified locally yet because Docker is not currently installed or available on this development machine.

## Testing

Backend tests cover:

- `GET /api/health`
- `GET /api/metrics`
- simulated metrics schema validation
- percentage metric bounds

Run tests:

```bash
pnpm test
```

## Roadmap

- Implement the real `RaspberryPiMetricsProvider`
- Add dashboard tests
- Improve chart controls and metric history views
- Add service/project monitoring for future home-lab apps
- Add Raspberry Pi deployment notes

## Status

MVP foundation is in progress. The backend, shared package, dashboard, tests, and Docker setup are implemented.
