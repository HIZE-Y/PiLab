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

It generates realistic fake Raspberry Pi metrics locally. The real hardware implementation reads Linux/Raspberry Pi system files:

```text
RaspberryPiMetricsProvider
```

Use `METRICS_PROVIDER=simulated` for local Mac development and `METRICS_PROVIDER=raspberry-pi` when running on the Raspberry Pi.

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

For local Mac development with simulated metrics:

```bash
cp .env.local.example .env.local
```

For Raspberry Pi development with real hardware metrics:

```bash
cp .env.pi.example .env.pi
```

If your Pi IP changes, update `.env.pi` and keep the scripts unchanged.

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

### Run On Raspberry Pi

Create `.env.pi` first, then run:

```bash
pnpm pi
```

## Scripts

Run all development servers with local simulated metrics:

```bash
pnpm dev
# or
pnpm local
```

Run on the Raspberry Pi with real hardware metrics:

```bash
pnpm pi
```

`pnpm local` reads `.env.local`; `pnpm pi` reads `.env.pi`.

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

## Raspberry Pi Shutdown Button

The dashboard can show a guarded shutdown button for the Raspberry Pi. It is disabled by default.

To enable it in development, set this in `.env.pi`:

```text
ALLOW_SYSTEM_SHUTDOWN=true
```

The API runs this command when shutdown is requested:

```bash
sudo shutdown now
```

For the button to work from the PiLab service without an interactive password prompt, the Pi user needs passwordless permission for only that command. On the Pi, create a sudoers file with `sudo visudo -f /etc/sudoers.d/pilab-shutdown` and add:

```text
yahyahiza ALL=(root) NOPASSWD: /usr/sbin/shutdown, /sbin/shutdown
```

Keep this disabled unless the dashboard is only reachable on your trusted home network.

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

- Add service monitoring for hosted home-lab projects
- Add dashboard tests
- Improve chart controls and metric history views
- Add service/project monitoring for future home-lab apps
- Add Raspberry Pi deployment notes

## Status

MVP foundation is in progress. The backend, shared package, dashboard, tests, and Docker setup are implemented.
