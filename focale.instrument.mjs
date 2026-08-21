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

export async function withFlow(flowKey, fn) {
  emitBoot();
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

export function flowMiddleware(flowKey) {
  return async (_c, next) => withFlow(flowKey, () => next());
}

// Pass this function to instrument(handler, workersOtelConfig). Do not call it at import time.
export function workersOtelConfig(env = {}, _trigger) {
  const dsn =
    env.FOCALE_DSN ||
    (typeof process !== 'undefined' ? process.env.FOCALE_DSN : undefined);
  const parsed = parseDsn(dsn);
  const headers = parsed
    ? { Authorization: `Bearer ${parsed.key}` }
    : undefined;
  const tracesEndpoint = parsed ? `${parsed.base}/v1/traces` : undefined;
  const metricsEndpoint = parsed ? `${parsed.base}/v1/metrics` : undefined;
  const logsEndpoint = parsed ? `${parsed.base}/v1/logs` : undefined;
  return {
    exporter: tracesEndpoint ? { url: tracesEndpoint, headers } : undefined,
    service: { name: env.OTEL_SERVICE_NAME || 'focale-watched' },
    focaleOtlp: { tracesEndpoint, metricsEndpoint, logsEndpoint, headers },
  };
}
