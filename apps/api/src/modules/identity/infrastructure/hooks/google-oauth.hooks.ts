import { createHash } from 'node:crypto';
import { createAuthMiddleware } from 'better-auth/api';
import { auditLogger } from '../shared/logger/audit-logger';
import { recordAuthEvent } from '../shared/metrics/auth-metrics';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface GoogleOAuthSuccessParams {
	userId: string;
	ipHash: string;
	correlationId: string;
}

export interface GoogleOAuthFailureParams {
	errorType: 'oauth_error';
	ipHash: string;
	correlationId: string;
}

export type GoogleOAuthHookParams =
	| GoogleOAuthSuccessParams
	| GoogleOAuthFailureParams;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function hashIp(ip: string): string {
	return createHash('sha256').update(ip).digest('hex');
}

// ---------------------------------------------------------------------------
// Core handler — exported for direct unit testing
// ---------------------------------------------------------------------------

export function handleGoogleOAuthAfter(params: GoogleOAuthHookParams): void {
	if ('userId' in params) {
		auditLogger.info({
			level: 'security',
			event: 'auth.google.success',
			userId: params.userId,
			provider: 'google',
			ipHash: params.ipHash,
			correlationId: params.correlationId,
			resultStatus: 'success',
		});
		recordAuthEvent('auth.google.success', { provider: 'google' });
	} else {
		auditLogger.warn({
			level: 'security',
			event: 'auth.google.failure',
			error_type: params.errorType,
			provider: 'google',
			ipHash: params.ipHash,
			correlationId: params.correlationId,
			resultStatus: 'failure',
		});
		recordAuthEvent('auth.google.failure', {
			provider: 'google',
			error_type: 'oauth_error',
		});
	}
}

// ---------------------------------------------------------------------------
// Minimal context shape — structural subtype of the real middleware context
// ---------------------------------------------------------------------------

export interface AfterHookCtx {
	request?: Request;
	path: string;
	getHeader: (name: string) => string | null | undefined;
	context: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Inner middleware body — exported for use in the combined after hook
// ---------------------------------------------------------------------------

export async function googleOAuthAfterMiddlewareBody(
	ctx: AfterHookCtx,
): Promise<void> {
	if (!ctx.request) return;
	if (ctx.path !== '/sign-in/social') return;

	const ip =
		ctx.getHeader('x-forwarded-for') ?? ctx.getHeader('x-real-ip') ?? '';
	const ipHash = hashIp(ip);
	const correlationId = crypto.randomUUID();

	const returned = ctx.context.returned;
	const user = (returned as Record<string, unknown> | undefined)?.user;
	const userId =
		typeof (user as Record<string, unknown> | undefined)?.id === 'string'
			? ((user as Record<string, unknown>).id as string)
			: undefined;

	if (userId) {
		handleGoogleOAuthAfter({ userId, ipHash, correlationId });
	} else {
		handleGoogleOAuthAfter({ errorType: 'oauth_error', ipHash, correlationId });
	}
}

export const googleOAuthAfterHook = createAuthMiddleware(
	googleOAuthAfterMiddlewareBody,
);
