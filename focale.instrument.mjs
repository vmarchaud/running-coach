import { NodeSDK } from '@opentelemetry/sdk-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { BatchLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { Resource } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME } from '@opentelemetry/semantic-conventions';
import { trace, metrics } from '@opentelemetry/api';

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

const parsed = parseDsn(process.env.FOCALE_DSN);
const headers = parsed
  ? { Authorization: `Bearer ${parsed.key}` }
  : undefined;
const tracesEndpoint =
  process.env.OTEL_EXPORTER_OTLP_TRACES_ENDPOINT ||
  (parsed ? `${parsed.base}/v1/traces` : undefined);
const metricsEndpoint =
  process.env.OTEL_EXPORTER_OTLP_METRICS_ENDPOINT ||
  (parsed ? `${parsed.base}/v1/metrics` : undefined);
const logsEndpoint =
  process.env.OTEL_EXPORTER_OTLP_LOGS_ENDPOINT ||
  (parsed ? `${parsed.base}/v1/logs` : undefined);

const sdk = new NodeSDK({
  resource: new Resource({
    [ATTR_SERVICE_NAME]: process.env.OTEL_SERVICE_NAME || 'focale-watched',
  }),
  traceExporter: tracesEndpoint
    ? new OTLPTraceExporter({ url: tracesEndpoint, headers })
    : undefined,
  metricReader: metricsEndpoint
    ? new PeriodicExportingMetricReader({
        exporter: new OTLPMetricExporter({ url: metricsEndpoint, headers }),
      })
    : undefined,
  logRecordProcessors: logsEndpoint
    ? [
        new BatchLogRecordProcessor(
          new OTLPLogExporter({ url: logsEndpoint, headers }),
        ),
      ]
    : [],
});

await sdk.start();

const boot = trace.getTracer('focale').startSpan('focale.boot');
boot.setAttribute('focale.boot', true);
boot.end();
metrics.getMeter('focale').createCounter('focale.boot').add(1, { 'focale.boot': true });
