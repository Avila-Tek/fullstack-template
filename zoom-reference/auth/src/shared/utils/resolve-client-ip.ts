import type { IncomingMessage } from 'node:http';

/**
 * Resolves the client IP from a Better Auth hook context.
 *
 * Reads `x-forwarded-for` set by the trusted upstream proxy (orchestrator).
 * Best-effort — for forensic audit logging only, not access control.
 */
export function resolveClientIp(ctx: {
	getHeader: (name: string) => string | null | undefined;
}): string {
	const forwarded = ctx.getHeader('x-forwarded-for');
	if (forwarded) return forwarded.split(',')[0]?.trim() ?? 'unknown';
	return 'unknown';
}

/**
 * Resolves the client IP from a Node.js IncomingMessage (NestJS controllers).
 *
 * Reads `x-forwarded-for` set by the trusted upstream proxy (orchestrator).
 * Best-effort — for forensic audit logging only, not access control.
 */
export function resolveClientIpFromRequest(req: IncomingMessage): string {
	const forwarded = req.headers['x-forwarded-for'];
	if (typeof forwarded === 'string' && forwarded) {
		return forwarded.split(',')[0]?.trim() ?? 'unknown';
	}
	return 'unknown';
}
