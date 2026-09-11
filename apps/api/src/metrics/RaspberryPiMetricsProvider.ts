import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { promisify } from "node:util";
import { SystemMetricsSchema } from "@pilab/shared";
import type { SystemMetrics } from "@pilab/shared";
import type { MetricsProvider } from "./MetricsProvider.js";

const execFileAsync = promisify(execFile);

type CpuSnapshot = {
  idle: number;
  total: number;
};

type NetworkSnapshot = {
  rxBytes: number;
  txBytes: number;
  timestampMs: number;
};

export class RaspberryPiMetricsProvider implements MetricsProvider {
  private previousCpuSnapshot: CpuSnapshot | null = null;
  private previousNetworkSnapshot: NetworkSnapshot | null = null;

  async getCurrentMetrics(): Promise<SystemMetrics> {
    const [cpuUsagePercent, cpuTemperatureCelsius, ramUsagePercent, diskUsagePercent, uptimeSeconds, network] =
      await Promise.all([
        this.readCpuUsagePercent(),
        this.readCpuTemperatureCelsius(),
        this.readRamUsagePercent(),
        this.readDiskUsagePercent(),
        this.readUptimeSeconds(),
        this.readNetworkActivity()
      ]);

    const metrics: SystemMetrics = {
      timestamp: new Date().toISOString(),
      cpuUsagePercent,
      cpuTemperatureCelsius,
      ramUsagePercent,
      diskUsagePercent,
      uptimeSeconds,
      networkRxBytesPerSecond: network.rxBytesPerSecond,
      networkTxBytesPerSecond: network.txBytesPerSecond
    };

    return SystemMetricsSchema.parse(metrics);
  }

  private async readCpuUsagePercent() {
    const snapshot = await this.readCpuSnapshot();
    const previousSnapshot = this.previousCpuSnapshot;
    this.previousCpuSnapshot = snapshot;

    if (!previousSnapshot) {
      return 0;
    }

    const idleDelta = snapshot.idle - previousSnapshot.idle;
    const totalDelta = snapshot.total - previousSnapshot.total;

    if (totalDelta <= 0) {
      return 0;
    }

    return this.roundPercent((1 - idleDelta / totalDelta) * 100);
  }

  private async readCpuSnapshot(): Promise<CpuSnapshot> {
    const stat = await readFile("/proc/stat", "utf8");
    const cpuLine = stat.split("\n").find((line) => line.startsWith("cpu "));

    if (!cpuLine) {
      throw new Error("Unable to read CPU stats from /proc/stat");
    }

    const values = cpuLine
      .trim()
      .split(/\s+/)
      .slice(1)
      .map((value) => Number(value));

    const [user = 0, nice = 0, system = 0, idle = 0, iowait = 0, irq = 0, softirq = 0, steal = 0] = values;
    const idleTotal = idle + iowait;
    const total = user + nice + system + idle + iowait + irq + softirq + steal;

    return {
      idle: idleTotal,
      total
    };
  }

  private async readCpuTemperatureCelsius() {
    const rawTemperature = await readFile(
      "/sys/class/thermal/thermal_zone0/temp",
      "utf8"
    );

    return Number((Number(rawTemperature.trim()) / 1000).toFixed(1));
  }

  private async readRamUsagePercent() {
    const meminfo = await readFile("/proc/meminfo", "utf8");
    const values = new Map<string, number>();

    for (const line of meminfo.split("\n")) {
      const match = line.match(/^(\w+):\s+(\d+)\s+kB$/);

      if (match) {
        values.set(match[1], Number(match[2]));
      }
    }

    const total = values.get("MemTotal");
    const available = values.get("MemAvailable");

    if (!total || available === undefined) {
      throw new Error("Unable to read memory stats from /proc/meminfo");
    }

    return this.roundPercent(((total - available) / total) * 100);
  }

  private async readDiskUsagePercent() {
    const { stdout } = await execFileAsync("df", ["-k", "/"]);
    const [, dataLine] = stdout.trim().split("\n");

    if (!dataLine) {
      throw new Error("Unable to read disk usage from df");
    }

    const columns = dataLine.trim().split(/\s+/);
    const capacity = columns[4];

    if (!capacity?.endsWith("%")) {
      throw new Error("Unable to parse disk usage from df");
    }

    return this.clampPercent(Number(capacity.slice(0, -1)));
  }

  private async readUptimeSeconds() {
    const uptime = await readFile("/proc/uptime", "utf8");
    const [uptimeSeconds = "0"] = uptime.trim().split(/\s+/);
    return Math.floor(Number(uptimeSeconds));
  }

  private async readNetworkActivity() {
    const snapshot = await this.readNetworkSnapshot();
    const previousSnapshot = this.previousNetworkSnapshot;
    this.previousNetworkSnapshot = snapshot;

    if (!previousSnapshot) {
      return {
        rxBytesPerSecond: 0,
        txBytesPerSecond: 0
      };
    }

    const elapsedSeconds = Math.max(
      (snapshot.timestampMs - previousSnapshot.timestampMs) / 1000,
      1
    );

    return {
      rxBytesPerSecond: Math.max(
        0,
        Math.round((snapshot.rxBytes - previousSnapshot.rxBytes) / elapsedSeconds)
      ),
      txBytesPerSecond: Math.max(
        0,
        Math.round((snapshot.txBytes - previousSnapshot.txBytes) / elapsedSeconds)
      )
    };
  }

  private async readNetworkSnapshot(): Promise<NetworkSnapshot> {
    const netDev = await readFile("/proc/net/dev", "utf8");
    let rxBytes = 0;
    let txBytes = 0;

    for (const line of netDev.split("\n").slice(2)) {
      const [rawInterface, rawStats] = line.trim().split(":");

      if (!rawInterface || !rawStats || rawInterface === "lo") {
        continue;
      }

      const stats = rawStats.trim().split(/\s+/).map((value) => Number(value));
      rxBytes += stats[0] ?? 0;
      txBytes += stats[8] ?? 0;
    }

    return {
      rxBytes,
      txBytes,
      timestampMs: Date.now()
    };
  }

  private roundPercent(value: number) {
    return this.clampPercent(Math.round(value));
  }

  private clampPercent(value: number) {
    return Math.min(100, Math.max(0, value));
  }
}
