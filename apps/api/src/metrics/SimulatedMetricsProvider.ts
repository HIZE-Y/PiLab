import { SystemMetricsSchema } from "@pilab/shared";
import type { SystemMetrics } from "@pilab/shared";
import type { MetricsProvider } from "./MetricsProvider.js";

type NetworkState = {
  rxBytesPerSecond: number;
  txBytesPerSecond: number;
};

export class SimulatedMetricsProvider implements MetricsProvider {
  private readonly startedAt = Date.now();
  private cpuUsagePercent = 32;
  private cpuTemperatureCelsius = 48;
  private ramUsagePercent = 46;
  private diskUsagePercent = 38;
  private networkState: NetworkState = {
    rxBytesPerSecond: 150_000,
    txBytesPerSecond: 80_000
  };

  async getCurrentMetrics(): Promise<SystemMetrics> {
    this.cpuUsagePercent = this.nextValue(this.cpuUsagePercent, 8, 4, 96);
    this.cpuTemperatureCelsius = this.nextValue(
      this.cpuTemperatureCelsius,
      2.5,
      34,
      82
    );
    this.ramUsagePercent = this.nextValue(this.ramUsagePercent, 4, 16, 92);
    this.diskUsagePercent = this.nextValue(this.diskUsagePercent, 0.4, 30, 86);
    this.networkState = {
      rxBytesPerSecond: Math.round(
        this.nextValue(this.networkState.rxBytesPerSecond, 60_000, 20_000, 900_000)
      ),
      txBytesPerSecond: Math.round(
        this.nextValue(this.networkState.txBytesPerSecond, 35_000, 10_000, 500_000)
      )
    };

    const metrics: SystemMetrics = {
      timestamp: new Date().toISOString(),
      cpuUsagePercent: Math.round(this.cpuUsagePercent),
      cpuTemperatureCelsius: Number(this.cpuTemperatureCelsius.toFixed(1)),
      ramUsagePercent: Math.round(this.ramUsagePercent),
      diskUsagePercent: Math.round(this.diskUsagePercent),
      uptimeSeconds: Math.floor((Date.now() - this.startedAt) / 1000),
      networkRxBytesPerSecond: this.networkState.rxBytesPerSecond,
      networkTxBytesPerSecond: this.networkState.txBytesPerSecond
    };

    return SystemMetricsSchema.parse(metrics);
  }

  private nextValue(
    currentValue: number,
    maxStep: number,
    minimum: number,
    maximum: number
  ) {
    const step = (Math.random() * 2 - 1) * maxStep;
    const next = currentValue + step;
    return Math.min(maximum, Math.max(minimum, next));
  }
}
