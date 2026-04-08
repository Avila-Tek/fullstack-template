import { metrics } from '@opentelemetry/api';

const authEventsCounter = metrics
	.getMeter('identity')
	.createCounter('auth_events_total', {
		description: 'Count of auth funnel outcomes — authoritative backend source',
	});

export function recordAuthEvent(
	event: string,
	labels?: { provider?: string; error_type?: string },
): void {
	try {
		authEventsCounter.add(1, {
			event,
			provider: labels?.provider ?? '',
			error_type: labels?.error_type ?? '',
		});
	} catch {
		// Swallow — metrics must never break the auth flow
	}
}
