import { trace, metrics, SpanStatusCode } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { BasicTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';

// NodeSDK and getNodeAutoInstrumentations cannot run in a Worker isolate.
// This file registers official Tracer/Meter/Logger providers so withFlow
// and OTLP export have a backend. FOCALE_DSN is a Worker secret on env, not
// process.env at import time, so providers start in withWorkers / bindEnv.
// Skip OTLP when the ingest secret is missing. Do not use Node-only context managers.

function parseDsn(dsn) {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const key = decodeURIComponent(u.username || '');
    if (!key) return null;
    const base = `${u.protocol}//${u.host}`;
    return { key, base };
  } catch {
    return null;
  }
}

let providers = null;
let boundDsn = null;

function bindEnv(env) {
  if (!env) return;
  const dsn =
    env.FOCALE_DSN ||
    (typeof process !== 'undefined' ? process.env.FOCALE_DSN : undefined);
  if (providers && boundDsn === (dsn || '')) return;
  boundDsn = dsn || '';
  const parsed = parseDsn(dsn);
  const resource = new Resource({
    [ATTR_SERVICE_NAME]: env.OTEL_SERVICE_NAME || 'focale-watched',
    'focale.runtime': 'workers',
  });
  const tracerProvider = new BasicTracerProvider({ resource });
  const meterProvider = new MeterProvider({ resource });
  const loggerProvider = new LoggerProvider({ resource });
  if (parsed) {
    const headers = { Authorization: 'Bearer ' + parsed.key };
    const base = parsed.base;
    tracerProvider.addSpanProcessor(
      new SimpleSpanProcessor(
        new OTLPTraceExporter({ url: base + '/v1/traces', headers }),
      ),
    );
    meterProvider.addMetricReader(
      new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: base + '/v1/metrics', headers }),
        exportIntervalMillis: 60000,
      }),
    );
    loggerProvider.addLogRecordProcessor(
      new SimpleLogRecordProcessor(
        new OTLPLogExporter({ url: base + '/v1/logs', headers }),
      ),
    );
  }
  tracerProvider.register();
  metrics.setGlobalMeterProvider(meterProvider);
  logs.setGlobalLoggerProvider(loggerProvider);
  providers = { tracerProvider, meterProvider, loggerProvider };
}

async function flush() {
  if (!providers) return;
  await Promise.allSettled([
    providers.tracerProvider.forceFlush(),
    providers.meterProvider.forceFlush(),
    providers.loggerProvider.forceFlush(),
  ]);
}

let booted = false;
function emitBoot() {
  if (booted) return;
  booted = true;
  const boot = trace.getTracer('focale').startSpan('focale.boot');
  boot.setAttribute('focale.boot', true);
  boot.end();
  metrics.getMeter('focale').createCounter('focale.boot').add(1, { 'focale.boot': true });
}

export async function withFlow(flowKey, fn) {
  emitBoot();
  const tracer = trace.getTracer('focale');
  const meter = metrics.getMeter('focale');
  const logger = logs.getLogger('focale');
  const started = meter.createCounter('focale.flow.started');
  const succeeded = meter.createCounter('focale.flow.succeeded');
  const failed = meter.createCounter('focale.flow.failed');
  const duration = meter.createHistogram('focale.flow.duration', { unit: 'ms' });
  const attrs = { 'focale.flow_key': flowKey, 'focale.signal': `${flowKey}.started` };
  started.add(1, attrs);
  const t0 = Date.now();
  return tracer.startActiveSpan(flowKey, { attributes: attrs }, async (span) => {
    try {
      const result = await fn();
      span.setAttribute('focale.signal', `${flowKey}.succeeded`);
      span.setStatus({ code: SpanStatusCode.OK });
      succeeded.add(1, { 'focale.flow_key': flowKey, 'focale.signal': `${flowKey}.succeeded` });
      return result;
    } catch (err) {
      span.setAttribute('focale.signal', `${flowKey}.failed`);
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR });
      failed.add(1, { 'focale.flow_key': flowKey, 'focale.signal': `${flowKey}.failed` });
      logger.emit({
        severityNumber: SeverityNumber.ERROR,
        body: err instanceof Error ? err.message : String(err),
        attributes: { 'focale.flow_key': flowKey, 'focale.signal': `${flowKey}.failed` },
      });
      throw err;
    } finally {
      duration.record(Date.now() - t0, { 'focale.flow_key': flowKey });
      span.end();
    }
  });
}

// Wrap the default Worker export. bindEnv reads FOCALE_DSN from env, then
// ctx.waitUntil(flush) so OTLP export can finish after the response.
export function withWorkers(handler) {
  const after = (ctx, result) => {
    const done = Promise.resolve(result).finally(() => flush());
    if (ctx && typeof ctx.waitUntil === 'function') ctx.waitUntil(done);
    return result;
  };
  if (handler && (typeof handler.fetch === 'function' || typeof handler.scheduled === 'function')) {
    return {
      ...handler,
      fetch: handler.fetch
        ? (req, env, ctx) => {
            bindEnv(env);
            return after(ctx, handler.fetch(req, env, ctx));
          }
        : handler.fetch,
      scheduled: handler.scheduled
        ? (event, env, ctx) => {
            bindEnv(env);
            return after(ctx, handler.scheduled(event, env, ctx));
          }
        : handler.scheduled,
    };
  }
  if (typeof handler !== 'function') return handler;
  return (req, env, ctx) => {
    bindEnv(env);
    return after(ctx, handler(req, env, ctx));
  };
}
