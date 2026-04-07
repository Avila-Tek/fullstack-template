import { randomUUID } from 'node:crypto';
import { context, propagation } from '@opentelemetry/api';

interface CorrelationRequest {
	headers: Record<string, string | string[] | undefined>;
	correlationId?: string;
}

interface CorrelationResponse {
	setHeader(name: string, value: string): void;
}

/**
 * Express/NestJS-compatible middleware that reads or generates a correlation ID,
 * attaches it to the request, echoes it in the response header, and propagates
 * it as OpenTelemetry baggage so it flows across service boundaries.
 */
export function correlationIdMiddleware(
	req: CorrelationRequest,
	res: CorrelationResponse,
	next: () => void,
): void {
	const incoming = req.headers['x-correlation-id'];
	const fromHeader = Array.isArray(incoming) ? incoming[0] : incoming;
	const correlationId: string = fromHeader ?? randomUUID();

	req.correlationId = correlationId;
	res.setHeader('X-Correlation-Id', correlationId);

	const currentBaggage =
		propagation.getBaggage(context.active()) ?? propagation.createBaggage();
	const newBaggage = currentBaggage.setEntry('correlation.id', {
		value: correlationId,
	});
	const ctx = propagation.setBaggage(context.active(), newBaggage);

	context.with(ctx, next);
}
