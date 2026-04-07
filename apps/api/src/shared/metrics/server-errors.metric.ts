import { metrics } from '@opentelemetry/api';

const serviceName = process.env.OTEL_SERVICE_NAME ?? 'zoom-api';

const counter = metrics
	.getMeter(serviceName)
	.createCounter('http.server.errors_total', {
		description: 'Total number of HTTP 5xx server errors',
	});

export function incrementServerError(labels: {
	app: string;
	status_code: string;
	error_code: string;
}): void {
	counter.add(1, labels);
}
