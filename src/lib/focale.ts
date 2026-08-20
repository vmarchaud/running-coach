import { SpanStatusCode, metrics, trace, type Span } from "@opentelemetry/api";
import { SeverityNumber, logs } from "@opentelemetry/api-logs";
import { OTLPLogExporter } from "@opentelemetry/exporter-logs-otlp-http";
import { OTLPMetricExporter } from "@opentelemetry/exporter-metrics-otlp-http";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-http";
import type { Logger } from "@opentelemetry/api-logs";
import { Resource } from "@opentelemetry/resources";
import { BatchLogRecordProcessor, LoggerProvider } from "@opentelemetry/sdk-logs";
import { MeterProvider, PeriodicExportingMetricReader } from "@opentelemetry/sdk-metrics";
import { BatchSpanProcessor, TracerProvider } from "@opentelemetry/sdk-trace-base";

// Focale watching via the official OpenTelemetry SDK, wired to an OTLP/HTTP
// intake. Trace, metric, and log data is pushed to the host derived from
// FOCALE_DSN (https://<ingest-key>@host -> "Authorization: Bearer <ingest-key>"
// against https://host/v1/{traces,metrics,logs}).
//
// Standard OTEL_EXPORTER_OTLP_* env vars are honored as a fallback when
// FOCALE_DSN is absent, so the same code works against any OpenTelemetry
// collector.

export interface FocaleEnv {
  FOCALE_DSN?: string;
  OTEL_EXPORTER_OTLP_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_TRACES_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_METRICS_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_LOGS_ENDPOINT?: string;
  OTEL_EXPORTER_OTLP_HEADERS?: string;
  OTEL_RESOURCE_ATTRIBUTES?: string;
  [key: string]: unknown;
}

const SERVICE_NAME = "running-coach";

// Cloudflare Workers expose bindings (incl. secrets) only per-request, so we
// capture the most recent one at the top of each fetch/scheduled handler and
// re-read it lazily from here when a deep call (e.g. the coach agent) needs to
// init/emit.
let env: FocaleEnv = {};
export function bindFocale(e?: FocaleEnv): void {
  if (e) env = e;
}

let initialized = false;

function parseDsn(dsn: string): { base: string; headers: Record<string, string> } {
  try {
    const u = new URL(dsn);
    const key = decodeURIComponent(u.username);
    u.username = "";
    u.password = "";
    const base = u.toString().replace(/\/+$/, "");
    return { base, headers: key ? { Authorization: `Bearer ${key}` } : {} };
  } catch {
    return { base: dsn.replace(/\/+$/, ""), headers: {} };
  }
}

// OTEL_EXPORTER_OTLP_HEADERS format: "key1=value1,key2=value2".
function parseHeaders(raw?: string): Record<string, string> {
  if (!raw) return {};
  const out: Record<string, string> = {};
  for (const part of raw.split(",")) {
    const idx = part.indexOf("=");
    if (idx !== -1) out[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
  }
  return out;
}

function buildResource(): Resource {
  const attrs: Record<string, string> = { "service.name": SERVICE_NAME };
  const raw = env["OTEL_RESOURCE_ATTRIBUTES"];
  if (typeof raw === "string" && raw.trim()) {
    for (const part of raw.split(",")) {
      const idx = part.indexOf("=");
      if (idx !== -1) attrs[part.slice(0, idx).trim()] = part.slice(idx + 1).trim();
    }
  }
  return new Resource(attrs);
}

type Signal = "traces" | "metrics" | "logs";

function resolveEndpoint(signal: Signal): { url: string; headers: Record<string, string> } | null {
  const dsn = typeof env.FOCALE_DSN === "string" ? env.FOCALE_DSN.trim() : "";
  if (dsn) {
    const { base, headers } = parseDsn(dsn);
    return { url: `${base}/v1/${signal}`, headers };
  }

  const upper = signal.toUpperCase();
  const perSignal = env[`OTEL_EXPORTER_OTLP_${upper}_ENDPOINT`];
  const base = env["OTEL_EXPORTER_OTLP_ENDPOINT"];
  const headers = parseHeaders(env.OTEL_EXPORTER_OTLP_HEADERS as string | undefined);
  if (perSignal) return { url: String(perSignal), headers };
  if (base) return { url: `${String(base).replace(/\/+$/, "")}/v1/${signal}`, headers };
  return null;
}

export function initFocale(bindings?: FocaleEnv): void {
  if (bindings) bindFocale(bindings);
  if (initialized) return;
  initialized = true;

  const resource = buildResource();

  const traces = resolveEndpoint("traces");
  if (traces) {
    const provider = new TracerProvider({
      resource,
      spanProcessors: [new BatchSpanProcessor(new OTLPTraceExporter({ url: traces.url, headers: traces.headers }))],
    });
    provider.register();
  }

  const metricsEndpoint = resolveEndpoint("metrics");
  if (metricsEndpoint) {
    const meterProvider = new MeterProvider({ resource });
    meterProvider.addMetricReader(
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: metricsEndpoint.url, headers: metricsEndpoint.headers }),
        exportIntervalMillis: 30_000,
      })
    );
    metrics.setGlobalMeterProvider(meterProvider);
  }

  const logsEndpoint = resolveEndpoint("logs");
  if (logsEndpoint) {
    const loggerProvider = new LoggerProvider({ resource });
    loggerProvider.addLogRecordProcessor(
      new BatchLogRecordProcessor(new OTLPLogExporter({ url: logsEndpoint.url, headers: logsEndpoint.headers }))
    );
    logs.setGlobalLoggerProvider(loggerProvider);
  }

  // Boot marker — one span at process start so the intake can see the app came
  // up, before any flow is exercised.
  const boot = trace.getTracer(SERVICE_NAME).startSpan(`${SERVICE_NAME}.boot`);
  boot.setAttribute("focale.boot", true);
  boot.setStatus({ code: SpanStatusCode.OK });
  boot.end();
}

function emitLog(
  flowKey: string,
  body: string,
  opts: { severity: "WARN" | "ERROR"; span?: Span; err?: unknown }
): void {
  initFocale();
  const attributes: Record<string, string> = {
    "focale.flow_key": flowKey,
    "focale.signal": `${flowKey}.failed`,
  };
  const severityNumber =
    opts.severity === "ERROR" ? SeverityNumber.ERROR : SeverityNumber.WARN;
  const record: {
    severityNumber: number;
    severityText: string;
    body: string;
    attributes: Record<string, string>;
    timestamp: number;
    traceId?: string;
    spanId?: string;
  } = {
    severityNumber,
    severityText: opts.severity,
    body,
    attributes,
    timestamp: Date.now(),
  };
  if (opts.span) {
    const ctx = opts.span.spanContext();
    record.traceId = ctx.traceId;
    record.spanId = ctx.spanId;
  }
  if (opts.err instanceof Error && opts.err.message) {
    record.body = `${body}: ${opts.err.message}`;
  }
  (logs.getLogger(SERVICE_NAME).emit as Logger["emit"])(record);
}

// A confirmed backend flow wrapped in focale watching: a trace span for every
// attempt, `focale.flow.started/succeeded/failed` counters, a
// `focale.flow.duration` histogram, and an ERROR log on failure — all tagged
// with the shared focale attributes.
export async function withFocaleFlow<T>(
  flowKey: string,
  name: string,
  fn: () => Promise<T>
): Promise<T> {
  initFocale();

  const tracer = trace.getTracer(SERVICE_NAME);
  const meter = metrics.getMeter(SERVICE_NAME);
  const baseAttrs = { "focale.flow_key": flowKey };

  const flowStarted = meter.createCounter("focale.flow.started");
  const flowSucceeded = meter.createCounter("focale.flow.succeeded");
  const flowFailed = meter.createCounter("focale.flow.failed");
  const flowDuration = meter.createHistogram("focale.flow.duration");

  flowStarted.add(1, { ...baseAttrs, "focale.signal": `${flowKey}.started` });

  const span = tracer.startSpan(name, {
    attributes: { ...baseAttrs, "focale.signal": `${flowKey}.started` },
  });
  const startedAt = Date.now();

  try {
    const result = await fn();
    span.setStatus({ code: SpanStatusCode.OK });
    span.setAttribute("focale.signal", `${flowKey}.succeeded`);
    flowSucceeded.add(1, { ...baseAttrs, "focale.signal": `${flowKey}.succeeded` });
    return result;
  } catch (error) {
    const e = error instanceof Error ? error : new Error(String(error));
    span.recordException(e);
    span.setStatus({ code: SpanStatusCode.ERROR, message: e.message });
    span.setAttribute("focale.signal", `${flowKey}.failed`);
    flowFailed.add(1, { ...baseAttrs, "focale.signal": `${flowKey}.failed` });
    emitLog(flowKey, `Flow "${name}" failed`, { severity: "ERROR", span, err: e });
    throw error;
  } finally {
    flowDuration.record(Date.now() - startedAt, baseAttrs);
    span.end();
  }
}
