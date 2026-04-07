import * as Sentry from '@sentry/nestjs';

interface ScopeRequest {
	method: string;
	url: string;
	params: Record<string, string>;
}

/**
 * Sets Sentry scope tags and HTTP request context on every inbound request.
 * Runs before the filter chain so the scope is live when SentryGlobalFilter captures.
 * Body is intentionally omitted — PII risk.
 */
export function sentryScopeMiddleware(
	req: ScopeRequest,
	_res: unknown,
	next: () => void,
): void {
	// withIsolationScope ensures per-request scope isolation (Sentry v8+).
	// next() is called inside so downstream request handling is bound to this scope.
	Sentry.withIsolationScope((scope) => {
		scope.setTag('service', process.env.OTEL_SERVICE_NAME ?? 'unknown');
		scope.setTag('env', process.env.NODE_ENV ?? 'unknown');
		scope.setContext('http_request', {
			method: req.method,
			url: req.url,
			params: req.params,
		});
		next();
	});
}
