import type { SystemMetrics } from "@pilab/shared";
import { SystemMetricsSchema, SystemStatusSchema } from "@pilab/shared";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { io } from "socket.io-client";

const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const maxHistoryLength = 30;

type ConnectionStatus = "connecting" | "online" | "offline";
type WarningLevel = "normal" | "warning" | "critical";

type MetricCard = {
  label: string;
  value: string;
  detail: string;
  level: WarningLevel;
};

function getLevel(value: number, warning: number, critical: number): WarningLevel {
  if (value >= critical) {
    return "critical";
  }

  if (value >= warning) {
    return "warning";
  }

  return "normal";
}

function formatBytesPerSecond(value: number) {
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(1)} MB/s`;
  }

  return `${Math.round(value / 1_000)} KB/s`;
}

function formatUptime(totalSeconds: number) {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }

  return `${seconds}s`;
}

function toMetricCards(metrics: SystemMetrics): MetricCard[] {
  return [
    {
      label: "CPU Usage",
      value: `${metrics.cpuUsagePercent}%`,
      detail: "Processor load",
      level: getLevel(metrics.cpuUsagePercent, 70, 90)
    },
    {
      label: "CPU Temp",
      value: `${metrics.cpuTemperatureCelsius.toFixed(1)} C`,
      detail: "Thermal reading",
      level: getLevel(metrics.cpuTemperatureCelsius, 65, 78)
    },
    {
      label: "RAM Usage",
      value: `${metrics.ramUsagePercent}%`,
      detail: "Memory pressure",
      level: getLevel(metrics.ramUsagePercent, 75, 90)
    },
    {
      label: "Disk Usage",
      value: `${metrics.diskUsagePercent}%`,
      detail: "Storage capacity",
      level: getLevel(metrics.diskUsagePercent, 80, 92)
    },
    {
      label: "Uptime",
      value: formatUptime(metrics.uptimeSeconds),
      detail: "Current process session",
      level: "normal"
    },
    {
      label: "Network",
      value: formatBytesPerSecond(
        metrics.networkRxBytesPerSecond + metrics.networkTxBytesPerSecond
      ),
      detail: `${formatBytesPerSecond(metrics.networkRxBytesPerSecond)} down / ${formatBytesPerSecond(metrics.networkTxBytesPerSecond)} up`,
      level: "normal"
    }
  ];
}

function addMetricToHistory(history: SystemMetrics[], metrics: SystemMetrics) {
  return [...history, metrics].slice(-maxHistoryLength);
}

export function App() {
  const [currentMetrics, setCurrentMetrics] = useState<SystemMetrics | null>(null);
  const [history, setHistory] = useState<SystemMetrics[]>([]);
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("connecting");
  const [shutdownEnabled, setShutdownEnabled] = useState(false);
  const [shutdownMessage, setShutdownMessage] = useState<string | null>(null);
  const [isShutdownPending, setIsShutdownPending] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function loadSystemStatus() {
      try {
        const response = await fetch(`${apiUrl}/api/system`);

        if (!response.ok) {
          throw new Error(`System status request failed with ${response.status}`);
        }

        const systemStatus = SystemStatusSchema.parse(await response.json());

        if (isMounted) {
          setShutdownEnabled(systemStatus.shutdownEnabled);
        }
      } catch {
        if (isMounted) {
          setShutdownEnabled(false);
        }
      }
    }

    async function loadInitialMetrics() {
      try {
        const response = await fetch(`${apiUrl}/api/metrics`);

        if (!response.ok) {
          throw new Error(`Metrics request failed with ${response.status}`);
        }

        const metrics = SystemMetricsSchema.parse(await response.json());

        if (isMounted) {
          setCurrentMetrics(metrics);
          setHistory((previousHistory) => addMetricToHistory(previousHistory, metrics));
          setLastError(null);
        }
      } catch (error) {
        if (isMounted) {
          setConnectionStatus("offline");
          setLastError(error instanceof Error ? error.message : "Unable to load metrics");
        }
      }
    }

    void loadSystemStatus();
    void loadInitialMetrics();

    const socket = io(apiUrl, {
      transports: ["websocket", "polling"]
    });

    socket.on("connect", () => {
      setConnectionStatus("online");
      setLastError(null);
    });

    socket.on("disconnect", () => {
      setConnectionStatus("offline");
    });

    socket.on("connect_error", (error) => {
      setConnectionStatus("offline");
      setLastError(error.message);
    });

    socket.on("metrics:update", (payload: unknown) => {
      const metrics = SystemMetricsSchema.parse(payload);
      setCurrentMetrics(metrics);
      setHistory((previousHistory) => addMetricToHistory(previousHistory, metrics));
      setLastError(null);
    });

    socket.on("metrics:error", (payload: { message?: string }) => {
      setLastError(payload.message ?? "Unable to read metrics");
    });

    return () => {
      isMounted = false;
      socket.disconnect();
    };
  }, []);

  const cards = useMemo(
    () => (currentMetrics ? toMetricCards(currentMetrics) : []),
    [currentMetrics]
  );

  async function requestShutdown() {
    const confirmed = window.confirm(
      "Shut down the Raspberry Pi now? PiLab will go offline until you power it back on."
    );

    if (!confirmed) {
      return;
    }

    setIsShutdownPending(true);
    setShutdownMessage(null);

    try {
      const response = await fetch(`${apiUrl}/api/system/shutdown`, {
        method: "POST"
      });

      if (!response.ok) {
        throw new Error(`Shutdown request failed with ${response.status}`);
      }

      setShutdownMessage("Shutdown requested. The Raspberry Pi will power off shortly.");
    } catch (error) {
      setShutdownMessage(
        error instanceof Error ? error.message : "Unable to request shutdown"
      );
      setIsShutdownPending(false);
    }
  }

  const chartData = history.map((metrics) => ({
    time: new Date(metrics.timestamp).toLocaleTimeString([], {
      minute: "2-digit",
      second: "2-digit"
    }),
    cpu: metrics.cpuUsagePercent,
    ram: metrics.ramUsagePercent,
    temp: metrics.cpuTemperatureCelsius
  }));

  return (
    <main className="app-shell">
      <section className="hero-section">
        <div>
          <p className="eyebrow">PiLab Home Lab</p>
          <h1>Raspberry Pi Monitoring Dashboard</h1>
          <p className="intro">
            Live simulated Raspberry Pi metrics today, ready for real Pi hardware later.
          </p>
        </div>
        <div className="hero-actions">
          <div className={`status-pill status-${connectionStatus}`}>
            <span aria-hidden="true" />
            {connectionStatus}
          </div>
          {shutdownEnabled ? (
            <button
              className="shutdown-button"
              disabled={isShutdownPending}
              onClick={requestShutdown}
              type="button"
            >
              {isShutdownPending ? "Shutdown requested" : "Shut down Pi"}
            </button>
          ) : null}
        </div>
      </section>

      {lastError ? <p className="error-banner">{lastError}</p> : null}
      {shutdownMessage ? <p className="system-banner">{shutdownMessage}</p> : null}

      <section className="metric-grid" aria-label="Current system metrics">
        {currentMetrics ? (
          cards.map((card) => (
            <article className={`metric-card metric-${card.level}`} key={card.label}>
              <div>
                <p>{card.label}</p>
                <strong>{card.value}</strong>
              </div>
              <span>{card.detail}</span>
            </article>
          ))
        ) : (
          <p className="loading-state">Waiting for PiLab metrics...</p>
        )}
      </section>

      <section className="chart-section" aria-label="Recent metric history">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Recent History</p>
            <h2>Last {history.length} readings</h2>
          </div>
          <p>Updates every 2 seconds</p>
        </div>

        <div className="chart-wrap">
          {chartData.length > 1 ? (
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 12, right: 18, left: -18, bottom: 0 }}>
                <defs>
                  <linearGradient id="cpuFill" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#d6dde8" strokeDasharray="4 4" vertical={false} />
                <XAxis dataKey="time" tickLine={false} axisLine={false} minTickGap={22} />
                <YAxis tickLine={false} axisLine={false} domain={[0, 100]} />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="cpu"
                  stroke="#2563eb"
                  fill="url(#cpuFill)"
                  name="CPU %"
                />
                <Line type="monotone" dataKey="ram" stroke="#0f766e" dot={false} name="RAM %" />
                <Line type="monotone" dataKey="temp" stroke="#dc2626" dot={false} name="Temp C" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="loading-state">Collecting chart history...</p>
          )}
        </div>
      </section>
    </main>
  );
}
