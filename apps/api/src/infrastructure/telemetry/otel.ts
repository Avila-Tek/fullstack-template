/**
 * OpenTelemetry SDK bootstrap.
 *
 * In dev:  imported at the top of main.ts (SDK starts without full auto-instrumentation)
 * In prod: node --require ./dist/infrastructure/telemetry/otel.js dist/main.js
 *          (preloaded so patches apply before any module loads)
 */

// Load .env before anything else — env.ts parses process.env at import time
import 'dotenv/config';

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

// Use process.env directly — avoid circular import at bootstrap time (env.ts parses process.env too)
const serviceName = process.env.SERVICE_NAME ?? 'unknown-service';
const serviceVersion = process.env.SERVICE_VERSION ?? '0.0.0';
const serviceNamespace = process.env.SERVICE_NAMESPACE ?? 'default';
const otlpEndpoint = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]: serviceName,
  [ATTR_SERVICE_VERSION]: serviceVersion,
  'service.namespace': serviceNamespace,
  // Schema standard: deployment.environment is a required resource attribute
  'deployment.environment': process.env.NODE_ENV ?? 'development',
});

const traceExporter = otlpEndpoint ? new OTLPTraceExporter({ url: `${otlpEndpoint}/v1/traces` }) : undefined;
const metricExporter = otlpEndpoint ? new OTLPMetricExporter({ url: `${otlpEndpoint}/v1/metrics` }) : undefined;

const sdk = new NodeSDK({
  resource,
  ...(traceExporter ? { traceExporter } : {}),
  ...(metricExporter
    ? {
        metricReader: new PeriodicExportingMetricReader({
          exporter: metricExporter,
          exportIntervalMillis: 30_000,
        }),
      }
    : {}),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false },
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
