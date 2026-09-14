import { trace, metrics, SpanStatusCode } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';
import { ExportResultCode } from '@opentelemetry/core';
import { BasicTracerProvider, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { LoggerProvider, SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import {
  JsonTraceSerializer,
  JsonMetricsSerializer,
  JsonLogsSerializer,
} from '@opentelemetry/otlp-transformer';

// NodeSDK and getNodeAutoInstrumentations cannot run in a Worker isolate.
// This file registers official Tracer/Meter/Logger providers so withFlow
// and OTLP export have a backend. FOCALE_DSN is a Worker secret on env, not
// process.env at import time, so providers start in withWorkers / bindEnv.
// Skip OTLP when the ingest secret is missing. Do not use Node-only context managers.
//
// The official @opentelemetry/exporter-*-otlp-http packages ship a Node build
// and a "browser" build (XHR/sendBeacon based) selected via their package.json
// "browser" field. Bundlers resolve Workers builds through that same browser
// condition, but the resulting class throws synchronously when constructed
// here ("Class constructor OTLPExporterBase4 cannot be invoked without
// 'new'") — neither build actually targets the Workers runtime. We use fetch()
// directly with the OTLP JSON serializers instead, which has no such Node/
// browser platform split.

const OTLP_EXPORT_TIMEOUT_MS = 5000;

let inflight = 0;

function dbg(event, data) {
  console.log('[focale-debug]', JSON.stringify({ t: Date.now(), event, ...data }));
}

function signalKind(url) {
  if (String(url).endsWith('/v1/traces')) return 'traces';
  if (String(url).endsWith('/v1/metrics')) return 'metrics';
  if (String(url).endsWith('/v1/logs')) return 'logs';
  return 'unknown';
}

function makeFetchExporter(url, headers, serializer) {
  const kind = signalKind(url);
  const doExport = (item, resultCallback) => {
    let body;
    try {
      body = serializer.serializeRequest(item);
    } catch (err) {
      dbg('export.serialize_fail', { kind, err: String(err && err.message ? err.message : err) });
      resultCallback({ code: ExportResultCode.FAILED, error: err });
      return;
    }
    if (!body) {
      dbg('export.empty', { kind });
      resultCallback({ code: ExportResultCode.SUCCESS });
      return;
    }
    const bytes = body.byteLength ?? body.length ?? 0;
    inflight += 1;
    dbg('export.start', { kind, bytes, inflight });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), OTLP_EXPORT_TIMEOUT_MS);
    fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body,
      signal: controller.signal,
    })
      .then((res) => {
        dbg('export.response', { kind, status: res.status, inflight });
        if (!res.ok) throw new Error(`OTLP export to ${url} failed: ${res.status}`);
        resultCallback({ code: ExportResultCode.SUCCESS });
      })
      .catch((err) => {
        const name = err && err.name ? err.name : '';
        dbg('export.fail', {
          kind,
          name,
          aborted: name === 'AbortError',
          err: String(err && err.message ? err.message : err),
          inflight,
        });
        resultCallback({ code: ExportResultCode.FAILED, error: err });
      })
      .finally(() => {
        clearTimeout(timeout);
        inflight -= 1;
        dbg('export.end', { kind, inflight });
      });
  };
  return {
    export: doExport,
    async shutdown() {},
    async forceFlush() {
      dbg('exporter.forceFlush', { kind, inflight });
    },
  };
}

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
  // Provider/exporter construction must never be able to take the app down —
  // e.g. the OTLP exporters' bundled platform build can throw synchronously
  // in the Workers runtime, which previously crashed every request (500s)
  // before a response was ever produced.
  try {
    const parsed = parseDsn(dsn);
    dbg('bindEnv', {
      hasDsn: Boolean(dsn),
      host: parsed ? parsed.base : null,
      keyChars: parsed && parsed.key ? parsed.key.length : 0,
    });
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
          makeFetchExporter(base + '/v1/traces', headers, JsonTraceSerializer),
        ),
      );
      meterProvider.addMetricReader(
        new PeriodicExportingMetricReader({
          exporter: makeFetchExporter(base + '/v1/metrics', headers, JsonMetricsSerializer),
          exportIntervalMillis: 60000,
        }),
      );
      loggerProvider.addLogRecordProcessor(
        new SimpleLogRecordProcessor(
          makeFetchExporter(base + '/v1/logs', headers, JsonLogsSerializer),
        ),
      );
    }
    tracerProvider.register();
    metrics.setGlobalMeterProvider(meterProvider);
    logs.setGlobalLoggerProvider(loggerProvider);
    providers = { tracerProvider, meterProvider, loggerProvider };
    dbg('bindEnv.ok', { exporters: Boolean(parsed) });
  } catch (err) {
    dbg('bindEnv.fail', {
      name: err && err.name ? err.name : '',
      err: String(err && err.message ? err.message : err),
    });
    console.error('[focale] failed to initialize telemetry providers, continuing without them', err);
    providers = null;
  }
}

const FLUSH_TIMEOUT_MS = 3000;

function withTimeout(promise) {
  return Promise.race([
    Promise.resolve(promise),
    new Promise((resolve) => setTimeout(resolve, FLUSH_TIMEOUT_MS)),
  ]);
}

async function flush() {
  if (!providers) {
    dbg('flush.skip', { inflight, reason: 'no_providers' });
    return;
  }
  // forceFlush() can hang indefinitely inside the OTel SDK even with no
  // exporters registered — never let telemetry flush block the Worker.
  const t0 = Date.now();
  dbg('flush.start', { inflight });
  await Promise.allSettled([
    withTimeout(providers.tracerProvider.forceFlush()),
    withTimeout(providers.meterProvider.forceFlush()),
    withTimeout(providers.loggerProvider.forceFlush()),
  ]);
  dbg('flush.end', { inflight, ms: Date.now() - t0 });
}

let booted = false;
function emitBoot() {
  if (booted) {
    dbg('boot.skip', { inflight });
    return;
  }
  booted = true;
  dbg('boot.emit', { inflight, hasProviders: Boolean(providers) });
  const boot = trace.getTracer('focale').startSpan('focale.boot');
  boot.setAttribute('focale.boot', true);
  boot.end();
  metrics.getMeter('focale').createCounter('focale.boot').add(1, { 'focale.boot': true });
  dbg('boot.ended', { inflight });
}

function toFlowError(err) {
  if (err instanceof Error) return err;
  return new Error(err == null ? 'failed' : String(err));
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
    let marked = null;
    const flow = {
      fail(err) {
        marked = toFlowError(err);
      },
    };
    const recordFailed = (err) => {
      span.setAttribute('focale.signal', `${flowKey}.failed`);
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR });
      failed.add(1, { 'focale.flow_key': flowKey, 'focale.signal': `${flowKey}.failed` });
      logger.emit({
        severityNumber: SeverityNumber.ERROR,
        body: err instanceof Error ? err.message : String(err),
        attributes: { 'focale.flow_key': flowKey, 'focale.signal': `${flowKey}.failed` },
      });
    };
    try {
      const result = await fn(flow);
      if (marked) {
        recordFailed(marked);
        return result;
      }
      span.setAttribute('focale.signal', `${flowKey}.succeeded`);
      span.setStatus({ code: SpanStatusCode.OK });
      succeeded.add(1, { 'focale.flow_key': flowKey, 'focale.signal': `${flowKey}.succeeded` });
      return result;
    } catch (err) {
      recordFailed(toFlowError(err));
      throw err;
    } finally {
      duration.record(Date.now() - t0, { 'focale.flow_key': flowKey });
      span.end();
    }
  });
}

// Wrap the default Worker export. bindEnv reads FOCALE_DSN from env.
// Flush after the handler result AND any ctx.waitUntil work, so cron that
// only waitUntil(job) and returns void still exports before the isolate dies.
export function withWorkers(handler) {
  const run = (ctx, invoke) => {
    const pending = [];
    const origWaitUntil = ctx && typeof ctx.waitUntil === 'function' ? ctx.waitUntil.bind(ctx) : null;
    if (origWaitUntil) {
      ctx.waitUntil = (p) => {
        const task = Promise.resolve(p);
        pending.push(task);
        origWaitUntil(task);
      };
    }
    const result = invoke();
    const done = Promise.resolve(result)
      .then(() => Promise.allSettled(pending))
      .finally(() => flush())
      .finally(() => dbg('waitUntil.done', { inflight }));
    // Register `done` with the ORIGINAL waitUntil, not the patched one above —
    // otherwise `done` gets pushed into `pending` before it resolves, and its
    // own `Promise.allSettled(pending)` step would then be waiting on itself
    // forever (the exact cause of the "Worker hung" cancellations).
    if (origWaitUntil) origWaitUntil(done);
    else dbg('waitUntil.missing', { inflight });
    return result;
  };
  if (handler && (typeof handler.fetch === 'function' || typeof handler.scheduled === 'function')) {
    return {
      ...handler,
      fetch: handler.fetch
        ? (req, env, ctx) => {
            bindEnv(env);
            return run(ctx, () => handler.fetch(req, env, ctx));
          }
        : handler.fetch,
      scheduled: handler.scheduled
        ? (event, env, ctx) => {
            bindEnv(env);
            return run(ctx, () => handler.scheduled(event, env, ctx));
          }
        : handler.scheduled,
    };
  }
  if (typeof handler !== 'function') return handler;
  return (req, env, ctx) => {
    bindEnv(env);
    return run(ctx, () => handler(req, env, ctx));
  };
}
