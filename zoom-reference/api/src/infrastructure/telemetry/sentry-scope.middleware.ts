import * as Sentry from '@sentry/nestjs';
import { env } from '../../env';

const CORRELATION_ID_MAX_LENGTH = 64;

interface ScopeRequest {
	method: string;
	url: string;
	params: Record<string, string>;
	headers: Record<string, string | string[] | undefined>;
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
		scope.setTag('service', env.OTEL_SERVICE_NAME ?? 'unknown');
		scope.setTag('env', env.NODE_ENV);
		// correlation_id tag lets a single search in Sentry pull every event
		// related to one request across api/auth/orchestrator. correlationIdMiddleware
		// always populates this header before this middleware runs.
		const cidRaw = req.headers['x-correlation-id'];
		const cid = Array.isArray(cidRaw) ? cidRaw[0] : cidRaw;
		if (typeof cid === 'string' && cid.length > 0) {
			scope.setTag('correlation_id', cid.slice(0, CORRELATION_ID_MAX_LENGTH));
		}
		scope.setContext('http_request', {
			method: req.method,
			url: req.url,
			params: req.params,
		});
		next();
	});
}
