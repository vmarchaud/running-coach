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

let focaleOtlp = null;
const spanStack = [];
let booted = false;

function otlpNano() {
  return String(Date.now() * 1e6);
}
function otlpId(bytes) {
  const arr = new Uint8Array(bytes);
  crypto.getRandomValues(arr);
  return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
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

function bindEnv(env) {
  if (!env) return;
  const dsn =
    env.FOCALE_DSN ||
    (typeof process !== 'undefined' ? process.env.FOCALE_DSN : undefined);
  const parsed = parseDsn(dsn);
  const base = parsed ? parsed.base : 'http://127.0.0.1:4318';
  focaleOtlp = {
    tracesEndpoint: base + '/v1/traces',
    metricsEndpoint: base + '/v1/metrics',
    logsEndpoint: base + '/v1/logs',
    headers: parsed ? { Authorization: 'Bearer ' + parsed.key } : undefined,
    serviceName: env.OTEL_SERVICE_NAME || 'focale-watched',
  };
}

function exportMetric(name, attrs, opts) {
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
}

function exportLog(body, attrs) {
  if (!focaleOtlp || !focaleOtlp.logsEndpoint) return Promise.resolve();
  const parent = spanStack[spanStack.length - 1];
  const rec = {
    timeUnixNano: otlpNano(),
    severityNumber: 17,
    severityText: 'ERROR',
    body: { stringValue: String(body) },
    attributes: otlpAttrs(attrs),
  };
  if (parent) {
    rec.traceId = parent.traceId;
    rec.spanId = parent.spanId;
  }
  return postOtlp(focaleOtlp.logsEndpoint, {
    resourceLogs: [
      {
        resource: otlpResource(),
        scopeLogs: [{ scope: { name: 'focale' }, logRecords: [rec] }],
      },
    ],
  });
}

function exportSpan(span) {
  if (!focaleOtlp || !focaleOtlp.tracesEndpoint) return Promise.resolve();
  const rec = {
    traceId: span.traceId,
    spanId: span.spanId,
    name: span.name,
    kind: 1,
    startTimeUnixNano: span.start,
    endTimeUnixNano: otlpNano(),
    attributes: otlpAttrs(span.attrs),
    status: { code: span.error ? 2 : 1 },
  };
  if (span.parentSpanId) rec.parentSpanId = span.parentSpanId;
  return postOtlp(focaleOtlp.tracesEndpoint, {
    resourceSpans: [
      {
        resource: otlpResource(),
        scopeSpans: [{ scope: { name: 'focale' }, spans: [rec] }],
      },
    ],
  });
}

export async function withFlow(flowKey, fn) {
  const firstBoot = !booted;
  booted = true;
  const parent = spanStack[spanStack.length - 1];
  const span = {
    name: flowKey,
    traceId: (parent && parent.traceId) || otlpId(16),
    spanId: otlpId(8),
    parentSpanId: parent && parent.spanId,
    start: otlpNano(),
    attrs: { 'focale.flow_key': flowKey, 'focale.signal': flowKey + '.started' },
    error: false,
  };
  spanStack.push(span);
  const outgoing = [];
  if (firstBoot) {
    outgoing.push(
      exportSpan({
        name: 'focale.boot',
        traceId: span.traceId,
        spanId: otlpId(8),
        parentSpanId: span.spanId,
        start: span.start,
        attrs: { 'focale.boot': true },
        error: false,
      }),
    );
    outgoing.push(exportMetric('focale.boot', { 'focale.boot': true }, { kind: 'sum', value: 1 }));
  }
  const t0 = Date.now();
  outgoing.push(exportMetric('focale.flow.started', span.attrs, { kind: 'sum', value: 1 }));
  try {
    const result = await fn();
    span.attrs = { 'focale.flow_key': flowKey, 'focale.signal': flowKey + '.succeeded' };
    outgoing.push(exportMetric('focale.flow.succeeded', span.attrs, { kind: 'sum', value: 1 }));
    return result;
  } catch (err) {
    span.error = true;
    span.attrs = { 'focale.flow_key': flowKey, 'focale.signal': flowKey + '.failed' };
    outgoing.push(exportMetric('focale.flow.failed', span.attrs, { kind: 'sum', value: 1 }));
    outgoing.push(exportLog(err instanceof Error ? err.message : String(err), span.attrs));
    throw err;
  } finally {
    outgoing.push(
      exportMetric('focale.flow.duration', { 'focale.flow_key': flowKey }, {
        kind: 'histogram',
        value: Date.now() - t0,
        unit: 'ms',
      }),
    );
    outgoing.push(exportSpan(span));
    spanStack.pop();
    await Promise.allSettled(outgoing);
  }
}

export function flowMiddleware(flowKey) {
  return async (c, next) => {
    if (c && c.env) bindEnv(c.env);
    return withFlow(flowKey, () => next());
  };
}

export function withWorkers(handler) {
  const wrap = (fn) => {
    if (typeof fn !== 'function') return fn;
    return (arg0, env, arg2) => {
      bindEnv(env);
      return fn(arg0, env, arg2);
    };
  };
  if (handler && (typeof handler.fetch === 'function' || typeof handler.scheduled === 'function')) {
    return {
      ...handler,
      fetch: wrap(handler.fetch),
      scheduled: wrap(handler.scheduled),
    };
  }
  return wrap(handler);
}
