import { createAuthMiddleware } from 'better-auth/api';
import { resolveClientIp } from '@/shared/utils/resolve-client-ip';
import { auditLogger } from '../../utils/audit-logger';
import { recordAuthEvent } from '../../utils/auth-metrics';
import { hashIp } from '../../utils/hash-ip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SignInErrorType =
	| 'invalid_credentials'
	| 'email_not_verified'
	| 'rate_limited'
	| 'account_disabled'
	| 'unknown';

export interface SignInSuccessParams {
	userId: string;
	ipHash: string;
	userAgent: string;
	correlationId: string;
}

export interface SignInFailureParams {
	errorType: SignInErrorType;
	ipHash: string;
	userAgent: string;
	correlationId: string;
}

export type SignInHookParams = SignInSuccessParams | SignInFailureParams;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function deriveErrorType(returned: unknown): SignInErrorType {
	if (!returned || typeof returned !== 'object') return 'unknown';

	const err = returned as Record<string, unknown>;
	const body = err.body as Record<string, unknown> | undefined;
	const code = typeof body?.code === 'string' ? body.code : '';
	const statusCode = typeof err.statusCode === 'number' ? err.statusCode : 0;

	if (code === 'INVALID_EMAIL_OR_PASSWORD') return 'invalid_credentials';
	if (code === 'EMAIL_NOT_VERIFIED') return 'email_not_verified';
	if (statusCode === 429) return 'rate_limited';

	return 'unknown';
}

// ---------------------------------------------------------------------------
// Core handler — exported for direct unit testing (no middleware side-effects)
// ---------------------------------------------------------------------------

export function handleSignInAfter(params: SignInHookParams): void {
	if ('userId' in params) {
		auditLogger.info({
			level: 'security',
			event: 'auth.login.success',
			userId: params.userId,
			provider: 'email',
			ipHash: params.ipHash,
			userAgent: params.userAgent,
			correlationId: params.correlationId,
			resultStatus: 'success',
		});
		recordAuthEvent('auth.login.success', { provider: 'email' });
	} else {
		auditLogger.warn({
			level: 'security',
			event: 'auth.login.failure',
			error_type: params.errorType,
			provider: 'email',
			ipHash: params.ipHash,
			userAgent: params.userAgent,
			correlationId: params.correlationId,
			resultStatus: 'failure',
		});
		recordAuthEvent('auth.login.failure', {
			provider: 'email',
			error_type: params.errorType,
		});
	}
}

// ---------------------------------------------------------------------------
// Minimal context shape for the inner middleware body
// ---------------------------------------------------------------------------

export interface AfterHookCtx {
	request?: Request;
	path: string;
	getHeader: (name: string) => string | null | undefined;
	context: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Inner middleware body — exported so it can be called from the combined hook
// ---------------------------------------------------------------------------

export async function signInAfterMiddlewareBody(
	ctx: AfterHookCtx,
): Promise<void> {
	if (!ctx.request) return;
	if (ctx.path !== '/sign-in/email') return;

	const ip = resolveClientIp(ctx);
	const userAgent = ctx.getHeader('user-agent') ?? '';
	const ipHash = hashIp(ip);
	const correlationId = crypto.randomUUID();

	const returned = ctx.context.returned;
	const user = (returned as Record<string, unknown> | undefined)?.user;
	const userId =
		typeof (user as Record<string, unknown> | undefined)?.id === 'string'
			? ((user as Record<string, unknown>).id as string)
			: undefined;

	if (userId) {
		handleSignInAfter({ userId, ipHash, userAgent, correlationId });
	} else {
		const errorType = deriveErrorType(returned);
		handleSignInAfter({ errorType, ipHash, userAgent, correlationId });
	}
}

export const signInAfterHook = createAuthMiddleware(signInAfterMiddlewareBody);
