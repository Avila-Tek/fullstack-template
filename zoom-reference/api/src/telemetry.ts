import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';
import { env } from './env';

const endpoint = env.OTEL_EXPORTER_OTLP_ENDPOINT;
const serviceName = env.OTEL_SERVICE_NAME ?? 'zoom-api';

const sdk = new NodeSDK({
	resource: resourceFromAttributes({ 'service.name': serviceName }),
	traceExporter: new OTLPTraceExporter({ url: endpoint }),
	metricReader: new PeriodicExportingMetricReader({
		exporter: new OTLPMetricExporter({ url: endpoint }),
	}),
	logRecordProcessor: new SimpleLogRecordProcessor(
		new OTLPLogExporter({ url: endpoint }),
	),
	// Disable the pino auto-instrumentation: pino-opentelemetry-transport (wired
	// in shared/logger/pino.config.ts) already exports logs over OTLP. Leaving
	// both enabled emits every log record twice — once via the transport's own
	// OTLP client, once via the SDK's pino instrumentation — doubling Loki
	// ingest cost without adding signal.
	instrumentations: [
		getNodeAutoInstrumentations({
			'@opentelemetry/instrumentation-pino': { enabled: false },
		}),
	],
});

sdk.start();

process.on('SIGTERM', () => {
	sdk
		.shutdown()
		.then(() => process.exit(0))
		.catch(() => process.exit(1));
});
