import { hashIp } from './hash-ip';
import { resolveClientIp } from './resolve-client-ip';

export interface HookTelemetryFields {
	correlationId: string;
	ipAddress: string;
	userAgent: string;
	ipHash: string;
}

/**
 * Extracts the common telemetry fields emitted by every auth hook:
 * correlationId (generated if absent), client IP, user-agent, and ipHash.
 * Missing headers fall back to safe defaults ('' for user-agent, 'unknown' for IP).
 */
export function extractHookTelemetry(ctx: {
	getHeader: (name: string) => string | null | undefined;
}): HookTelemetryFields {
	const ipAddress = resolveClientIp(ctx);
	return {
		correlationId: ctx.getHeader('x-correlation-id') || crypto.randomUUID(),
		ipAddress,
		userAgent: ctx.getHeader('user-agent') ?? '',
		ipHash: hashIp(ipAddress),
	};
}
