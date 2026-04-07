import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-grpc';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-grpc';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-grpc';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { SimpleLogRecordProcessor } from '@opentelemetry/sdk-logs';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { NodeSDK } from '@opentelemetry/sdk-node';

const endpoint =
	process.env.OTEL_EXPORTER_OTLP_ENDPOINT ?? 'http://localhost:4317';
const serviceName = process.env.OTEL_SERVICE_NAME ?? 'zoom-api';

const sdk = new NodeSDK({
	resource: resourceFromAttributes({ 'service.name': serviceName }),
	traceExporter: new OTLPTraceExporter({ url: endpoint }),
	metricReader: new PeriodicExportingMetricReader({
		exporter: new OTLPMetricExporter({ url: endpoint }),
	}),
	logRecordProcessor: new SimpleLogRecordProcessor(
		new OTLPLogExporter({ url: endpoint }),
	),
	instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

process.on('SIGTERM', () => {
	sdk
		.shutdown()
		.then(() => process.exit(0))
		.catch(() => process.exit(1));
});
