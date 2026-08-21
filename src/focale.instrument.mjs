// Focale OpenTelemetry + "watching" glue for Hono on Cloudflare Workers
// Attach as an import (for types, no runtime)
// For Cloudflare Workers, use @hono/otel + @microlabs/otel-cf-workers as described by hono/otel docs.
// Only emit traces, metrics, logs via OTLP/HTTP to FOCALE_DSN per contract.

import { httpInstrumentationMiddleware } from '@hono/otel';
import { instrument } from '@microlabs/otel-cf-workers';

// Configures OTLP HTTP exporters automatically from FOCALE_DSN or OTEL_EXPORTER_OTLP_* vars
export function workersOtelConfig() {
  // Exporter config from FOCALE_DSN or OTEL_EXPORTER_OTLP_* (see contract)
  const dsn = typeof globalThis?.FOCALE_DSN !== 'undefined' ? globalThis.FOCALE_DSN : (globalThis.process?.env?.FOCALE_DSN);
  let baseUrl = undefined;
  let apiKey = undefined;
  if (dsn?.startsWith('https://') || dsn?.startsWith('http://')) {
    // Like https://<key>@host or http - split ([scheme, rest])
    const match = dsn.match(/^(https?:\/\/)([^@]+)@(.+)$/);
    if (match) {
      baseUrl = `${match[1]}${match[3]}`.replace(/\/$/, '');
      apiKey = match[2];
    }
  }

  // Fallback to OTEL_EXPORTER_OTLP_* if set
  return {
    url: baseUrl,
    headers: apiKey ? { 'Authorization': `Bearer ${apiKey}` } : undefined,
    paths: {
      traces: '/v1/traces',
      metrics: '/v1/metrics',
      logs: '/v1/logs',
    },
  };
}

/** Wrap a confirmed flow with Focale OpenTelemetry handlers
 * @param {string} flowKey
 * @param {Function} fn (args: ...)
 * @returns {Function}
 */
export function withFlow(flowKey, fn) {
  return async function(...args) {
    // @hono/otel adds context-based spans — we annotate with shared Focale attrs
    const span = globalThis?.__otel_current_span;
    if (span) {
      span.setAttribute('focale.flow_key', flowKey);
    }
    try {
      if (span) {
        span.setAttribute('focale.signal', `${flowKey}.started`);
      }
      const res = await fn.apply(this, args);
      if (span) {
        span.setAttribute('focale.signal', `${flowKey}.succeeded`);
      }
      return res;
    } catch (err) {
      if (span) {
        span.setAttribute('focale.signal', `${flowKey}.failed`);
      }
      throw err;
    }
  };
}

/** Middleware for Hono to add Focale flow attrs (for confirmed flows only) */
export function flowMiddleware(flowKey) {
  return async function(c, next) {
    // Inject Focale shared flow attributes into span if available
    const span = globalThis?.__otel_current_span;
    if (span) {
      span.setAttribute('focale.flow_key', flowKey);
      span.setAttribute('focale.signal', `${flowKey}.started`);
    }
    try {
      await next();
      if (span) {
        span.setAttribute('focale.signal', `${flowKey}.succeeded`);
      }
    } catch (err) {
      if (span) {
        span.setAttribute('focale.signal', `${flowKey}.failed`);
      }
      throw err;
    }
  };
}
