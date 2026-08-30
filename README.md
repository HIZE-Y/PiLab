# PiLab

PiLab is a home-lab monitoring platform designed to eventually run on a Raspberry Pi 4. The first MVP runs locally on a MacBook Pro and uses simulated Raspberry Pi metrics.

## MVP Goal

PiLab will show live system metrics such as CPU usage, CPU temperature, RAM usage, disk usage, uptime, and network activity. The app is designed so the simulated metrics provider can later be replaced by a real Raspberry Pi metrics provider without changing the API or dashboard.

## Planned Structure

```text
apps/
  api/          Node.js, TypeScript, Express, Socket.IO
  dashboard/    React, TypeScript, Vite
packages/
  shared/       Shared metric schemas and TypeScript types
```

## Planned Architecture

The backend will read metrics through a `MetricsProvider` interface:

```text
MetricsProvider
  SimulatedMetricsProvider
  RaspberryPiMetricsProvider
```

For the MVP, `SimulatedMetricsProvider` will generate fake Raspberry Pi metrics every two seconds. Later, `RaspberryPiMetricsProvider` can read real system data from the Pi.

## Planned Commands

These commands will work after the API, dashboard, shared package, and dependencies are added:

```bash
pnpm install
pnpm dev
pnpm test
pnpm build
```

## Status

Project foundation created. Backend, dashboard, shared types, tests, and Docker files will be added in later steps.
