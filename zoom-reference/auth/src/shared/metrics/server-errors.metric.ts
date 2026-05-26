import { metrics } from '@opentelemetry/api';
import { env } from '../../env';

const serviceName = env.OTEL_SERVICE_NAME ?? 'zoom-auth';

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
