import { trace, metrics, SpanStatusCode } from '@opentelemetry/api';
import { logs, SeverityNumber } from '@opentelemetry/api-logs';

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

let booted = false;
function emitBoot() {
  if (booted) return;
  booted = true;
  const boot = trace.getTracer('focale').startSpan('focale.boot');
  boot.setAttribute('focale.boot', true);
  boot.end();
  metrics.getMeter('focale').createCounter('focale.boot').add(1, { 'focale.boot': true });
}

const tracer = trace.getTracer('focale');
const meter = metrics.getMeter('focale');
const started = meter.createCounter('focale.flow.started');
const succeeded = meter.createCounter('focale.flow.succeeded');
const failed = meter.createCounter('focale.flow.failed');
const duration = meter.createHistogram('focale.flow.duration', { unit: 'ms' });
const logger = logs.getLogger('focale');

function exportMetric(name, attrs, opts) {
  const fn = globalThis.__focaleExportMetric;
  return typeof fn === 'function' ? fn(name, attrs, opts) : Promise.resolve();
}
function exportLog(body, attrs, severityNumber) {
  const fn = globalThis.__focaleExportLog;
  return typeof fn === 'function' ? fn(body, attrs, severityNumber) : Promise.resolve();
}

export async function withFlow(flowKey, fn) {
  const firstBoot = !booted;
  emitBoot();
  const attrs = { 'focale.flow_key': flowKey, 'focale.signal': `${flowKey}.started` };
  started.add(1, attrs);
  const t0 = Date.now();
  const outgoing = [];
  if (firstBoot) {
    outgoing.push(exportMetric('focale.boot', { 'focale.boot': true }, { kind: 'sum', value: 1 }));
  }
  outgoing.push(exportMetric('focale.flow.started', attrs, { kind: 'sum', value: 1 }));
  return tracer.startActiveSpan(flowKey, { attributes: attrs }, async (span) => {
    let failedFlow = false;
    try {
      const result = await fn();
      span.setAttribute('focale.signal', `${flowKey}.succeeded`);
      span.setStatus({ code: SpanStatusCode.OK });
      succeeded.add(1, { 'focale.flow_key': flowKey, 'focale.signal': `${flowKey}.succeeded` });
      return result;
    } catch (err) {
      failedFlow = true;
      span.setAttribute('focale.signal', `${flowKey}.failed`);
      span.recordException(err);
      span.setStatus({ code: SpanStatusCode.ERROR });
      failed.add(1, { 'focale.flow_key': flowKey, 'focale.signal': `${flowKey}.failed` });
      const logAttrs = { 'focale.flow_key': flowKey, 'focale.signal': `${flowKey}.failed` };
      logger.emit({
        severityNumber: SeverityNumber.ERROR,
        body: err instanceof Error ? err.message : String(err),
        attributes: logAttrs,
      });
      outgoing.push(
        exportLog(err instanceof Error ? err.message : String(err), logAttrs, 17),
      );
      throw err;
    } finally {
      const ms = Date.now() - t0;
      duration.record(ms, { 'focale.flow_key': flowKey });
      const signal = failedFlow ? 'failed' : 'succeeded';
      outgoing.push(
        exportMetric(`focale.flow.${signal}`, {
          'focale.flow_key': flowKey,
          'focale.signal': `${flowKey}.${signal}`,
        }, { kind: 'sum', value: 1 }),
      );
      outgoing.push(
        exportMetric('focale.flow.duration', { 'focale.flow_key': flowKey }, {
          kind: 'histogram',
          value: ms,
          unit: 'ms',
        }),
      );
      await Promise.allSettled(outgoing);
      span.end();
    }
  });
}

export function flowMiddleware(flowKey) {
  return async (_c, next) => withFlow(flowKey, () => next());
}

// Microlabs only ships traces. POST metrics and logs ourselves so they are not no-ops.
let focaleOtlp = null;

function otlpNano() {
  return String(Date.now() * 1e6);
}
function otlpAttrs(attrs) {
  return Object.entries(attrs || {}).map(([key, value]) => ({
    key,
    value:
      typeof value === 'boolean'
        ? { boolValue: value }
        : typeof value === 'number'
          ? Number.isInteger(value)
            ? { intValue: String(value) }
            : { doubleValue: value }
          : { stringValue: String(value) },
  }));
}
function otlpResource() {
  return {
    attributes: otlpAttrs({
      'service.name': (focaleOtlp && focaleOtlp.serviceName) || 'focale-watched',
      'focale.runtime': 'workers',
      'telemetry.sdk.language': 'webjs',
    }),
  };
}
function postOtlp(url, payload) {
  if (!url || !focaleOtlp) return Promise.resolve();
  const headers = { 'content-type': 'application/json' };
  if (focaleOtlp.headers) Object.assign(headers, focaleOtlp.headers);
  return fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
    .then((res) => {
      if (res && res.body && typeof res.body.cancel === 'function') res.body.cancel();
    })
    .catch(() => {});
}

globalThis.__focaleExportMetric = function (name, attrs, opts) {
  if (!focaleOtlp || !focaleOtlp.metricsEndpoint) return Promise.resolve();
  const t = otlpNano();
  const point = {
    attributes: otlpAttrs(attrs),
    timeUnixNano: t,
    startTimeUnixNano: t,
  };
  const metric =
    opts && opts.kind === 'histogram'
      ? {
          name,
          unit: (opts && opts.unit) || 'ms',
          histogram: {
            aggregationTemporality: 1,
            dataPoints: [{ ...point, count: 1, sum: opts.value }],
          },
        }
      : {
          name,
          sum: {
            aggregationTemporality: 1,
            isMonotonic: true,
            dataPoints: [{ ...point, asInt: String((opts && opts.value) ?? 1) }],
          },
        };
  return postOtlp(focaleOtlp.metricsEndpoint, {
    resourceMetrics: [
      {
        resource: otlpResource(),
        scopeMetrics: [{ scope: { name: 'focale' }, metrics: [metric] }],
      },
    ],
  });
};

globalThis.__focaleExportLog = function (body, attrs, severityNumber) {
  if (!focaleOtlp || !focaleOtlp.logsEndpoint) return Promise.resolve();
  const span = trace.getActiveSpan && trace.getActiveSpan();
  const ctx = span && span.spanContext ? span.spanContext() : null;
  const rec = {
    timeUnixNano: otlpNano(),
    severityNumber: severityNumber || 17,
    severityText: 'ERROR',
    body: { stringValue: String(body) },
    attributes: otlpAttrs(attrs),
  };
  if (ctx && ctx.traceId) rec.traceId = ctx.traceId;
  if (ctx && ctx.spanId) rec.spanId = ctx.spanId;
  return postOtlp(focaleOtlp.logsEndpoint, {
    resourceLogs: [
      {
        resource: otlpResource(),
        scopeLogs: [{ scope: { name: 'focale' }, logRecords: [rec] }],
      },
    ],
  });
};

// Pass this function to instrument(handler, workersOtelConfig). Do not call it at import time.
export function workersOtelConfig(env = {}, _trigger) {
  const dsn =
    env.FOCALE_DSN ||
    (typeof process !== 'undefined' ? process.env.FOCALE_DSN : undefined);
  const parsed = parseDsn(dsn);
  const base = parsed ? parsed.base : 'http://127.0.0.1:4318';
  const headers = parsed
    ? { Authorization: `Bearer ${parsed.key}` }
    : undefined;
  const tracesEndpoint = `${base}/v1/traces`;
  const metricsEndpoint = `${base}/v1/metrics`;
  const logsEndpoint = `${base}/v1/logs`;
  focaleOtlp = {
    tracesEndpoint,
    metricsEndpoint,
    logsEndpoint,
    headers,
    serviceName: env.OTEL_SERVICE_NAME || 'focale-watched',
  };
  return {
    exporter: { url: tracesEndpoint, headers },
    service: { name: focaleOtlp.serviceName },
  };
}
