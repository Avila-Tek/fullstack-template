import { metrics } from '@opentelemetry/api';

const apiEventsCounter = metrics
	.getMeter('zoom-api')
	.createCounter('api_events_total', {
		description:
			'Count of business-domain events emitted by apps/api use cases. Authoritative metric source for the Product KPIs dashboard.',
	});

export interface ApiEventLabels {
	readonly module?: string;
	readonly outcome?: string;
	readonly error_code?: string;
}

/**
 * Records a business-domain event as an OTel counter increment.
 *
 * Emits alongside the corresponding structured log — logs keep their value for
 * surrounding context (correlation IDs, business IDs) while the metric is what
 * dashboards and alerts query.
 *
 * @see docs/observability/kpi-catalog.md for which events are KPIs vs logs-only.
 */
export function recordApiEvent(event: string, labels?: ApiEventLabels): void {
	try {
		apiEventsCounter.add(1, {
			event,
			module: labels?.module ?? '',
			outcome: labels?.outcome ?? '',
			error_code: labels?.error_code ?? '',
		});
	} catch {
		// Swallow — metrics must never break business flows
	}
}
