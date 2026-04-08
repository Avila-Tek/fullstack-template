import { signUpInput } from '@repo/schemas';
import { createAuthMiddleware } from 'better-auth/api';
import type { SignupEventType } from '../../../application/ports/out/audit-log-service.port';
import { googleCaptchaService } from '../../security/google-captcha.adapter';
import { auditLogger } from '../../utils/audit-logger';
import { recordAuthEvent } from '../../utils/auth-metrics';
import { hashIp } from '../../utils/hash-ip';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SignUpBody {
	email?: unknown;
	password?: unknown;
	captchaToken?: unknown;
	captchaVersion?: unknown;
	termsAccepted?: unknown;
	termsAcceptedVersion?: unknown;
}

// Minimal context shape satisfied by both the real MiddlewareContext and test mocks.
export interface SignUpHookContext {
	request: {
		method: string;
		url?: string;
		json?: () => Promise<unknown>;
		clone?: () => { json: () => Promise<unknown> };
	};
	path: string;
}

export interface PendingTermsEntry {
	resolvedTermsVersion: string;
	termsAcceptedAt: Date;
}

// ---------------------------------------------------------------------------
// Module-level correlation store
// Key: correlationId (UUID), value: T&C data picked up by databaseHook
// TTL: entries older than 5 minutes are pruned on every set to prevent leaks.
// ---------------------------------------------------------------------------
const TERMS_TTL_MS = 5 * 60 * 1000;

interface TimedTermsEntry extends PendingTermsEntry {
	createdAt: number;
}

const pendingTermsMap = new Map<string, TimedTermsEntry>();

function pruneExpiredEntries(): void {
	const now = Date.now();
	for (const [key, entry] of pendingTermsMap) {
		if (now - entry.createdAt > TERMS_TTL_MS) {
			pendingTermsMap.delete(key);
		}
	}
}

/** Exported for testing and for use in databaseHooks.user.create.before. */
export function getPendingTermsData(
	correlationId: string,
): PendingTermsEntry | undefined {
	return pendingTermsMap.get(correlationId);
}

/** Remove a correlation entry once the DB hook has consumed it. */
export function consumePendingTermsData(
	correlationId: string,
): PendingTermsEntry | undefined {
	const entry = pendingTermsMap.get(correlationId);
	pendingTermsMap.delete(correlationId);
	return entry;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function jsonResponse(status: number, body: Record<string, unknown>): Response {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'Content-Type': 'application/json' },
	});
}

async function parseBody(
	req: SignUpHookContext['request'],
): Promise<SignUpBody> {
	let raw: unknown;
	if (typeof req.json === 'function') {
		raw = await req.json();
	} else if (typeof req.clone === 'function') {
		raw = await req.clone().json();
	} else {
		raw = {};
	}
	return raw as SignUpBody;
}

function validateInputFields(body: SignUpBody): Response | undefined {
	const result = signUpInput.safeParse(body);
	if (result.success) return undefined;

	const field = result.error.issues[0]?.path[0];
	const message = result.error.issues[0]?.message;

	if (field === 'captchaToken')
		return jsonResponse(422, { error: 'captcha_token_required' });
	if (field === 'termsAccepted')
		return jsonResponse(422, { error: 'terms_not_accepted' });
	if (field === 'termsAcceptedVersion')
		return jsonResponse(422, { error: 'terms_version_mismatch' });
	if (field === 'email') return jsonResponse(422, { error: 'invalid_email' });
	if (field === 'password')
		return jsonResponse(422, { error: 'credentials_too_weak', message });
	return jsonResponse(422, { error: 'invalid_input' });
}

async function verifyCaptcha(body: SignUpBody): Promise<Response | undefined> {
	const captchaToken =
		typeof body.captchaToken === 'string' ? body.captchaToken : '';
	const captchaVersion =
		body.captchaVersion === 'v2' ? ('v2' as const) : ('v3' as const);
	const result = await googleCaptchaService.verify(
		captchaToken,
		captchaVersion,
	);
	if (!result.success) {
		if (result.challenge === 'v2') {
			return jsonResponse(403, { error: 'captcha_challenge', challenge: 'v2' });
		}
		return jsonResponse(422, { error: 'captcha_failed' });
	}
	return undefined;
}

// TODO: replace with DB-based terms version lookup
async function verifyTermsVersion(
	_body: SignUpBody,
): Promise<{ error: Response } | { resolvedVersion: string }> {
	return { resolvedVersion: '1.0.0' };
}

// ---------------------------------------------------------------------------
// Core handler — exported for direct unit testing (no telemetry side-effects)
// ---------------------------------------------------------------------------

export async function handleSignUpBefore(
	context: SignUpHookContext,
): Promise<Response | undefined> {
	if (context.request.method !== 'POST' || context.path !== '/sign-up/email') {
		return undefined;
	}

	const body = await parseBody(context.request);

	const inputError = validateInputFields(body);
	if (inputError) return inputError;

	const captchaError = await verifyCaptcha(body);
	if (captchaError) return captchaError;

	const termsResult = await verifyTermsVersion(body);
	if ('error' in termsResult) return termsResult.error;

	pruneExpiredEntries();
	const correlationId = crypto.randomUUID();
	pendingTermsMap.set(correlationId, {
		resolvedTermsVersion: termsResult.resolvedVersion,
		termsAcceptedAt: new Date(),
		createdAt: Date.now(),
	});

	(context.request as Record<string, unknown>)._signupCorrelationId =
		correlationId;

	return undefined;
}

// ---------------------------------------------------------------------------
// Telemetry helpers (only used inside the real middleware wrapper)
// ---------------------------------------------------------------------------

function failureEventType(errorCode: string): SignupEventType {
	const map: Record<string, SignupEventType> = {
		captcha_challenge: 'signup_captcha_challenge',
		captcha_failed: 'signup_failure',
		captcha_token_required: 'signup_failure',
		credentials_too_weak: 'signup_failure',
		invalid_email: 'signup_failure',
		terms_not_accepted: 'signup_failure',
		terms_version_mismatch: 'signup_tc_version_mismatch',
		terms_version_unavailable: 'signup_tc_version_unavailable',
	};
	return map[errorCode] ?? 'signup_failure';
}

// ---------------------------------------------------------------------------
// Inner middleware body — exported so it can be called from the composed hook
// in auth.ts (same pattern as signInAfterMiddlewareBody)
// ---------------------------------------------------------------------------

export async function signUpBeforeHookBody(
	ctx: Parameters<Parameters<typeof createAuthMiddleware>[0]>[0],
): Promise<Response | undefined> {
	if (!ctx.request) return;

	const ip =
		ctx.getHeader('x-forwarded-for') ?? ctx.getHeader('x-real-ip') ?? '';
	const userAgent = ctx.getHeader('user-agent') ?? '';
	const ipHash = hashIp(ip);
	const correlationId = crypto.randomUUID();

	auditLogger.info({
		level: 'security',
		event: 'signup_attempt',
		correlationId,
		ipHash,
		userAgent,
		resultStatus: 'success',
	});

	const syntheticCtx: SignUpHookContext = {
		request: ctx.request,
		path: ctx.path,
	};

	const result = await handleSignUpBefore(syntheticCtx);

	if (result !== undefined) {
		let errorCode = 'unknown';
		try {
			const body = (await result.clone().json()) as Record<string, unknown>;
			errorCode = typeof body.error === 'string' ? body.error : 'unknown';
		} catch {
			// swallow — body parsing is best-effort for telemetry
		}

		const evtType = failureEventType(errorCode);
		auditLogger.warn({
			level: 'security',
			event: evtType,
			correlationId,
			ipHash,
			userAgent,
			resultStatus: 'failure',
			failureReason: errorCode,
		});
		if (evtType === 'signup_failure') {
			recordAuthEvent('signup_failure', { error_type: errorCode });
		}

		return result;
	}

	auditLogger.info({
		level: 'security',
		event: 'signup_success',
		correlationId,
		ipHash,
		userAgent,
		resultStatus: 'success',
	});
	recordAuthEvent('signup_success');
}

// ---------------------------------------------------------------------------
// Better Auth AuthMiddleware — wired into betterAuth({ hooks: { before } })
// ---------------------------------------------------------------------------

export const signUpBeforeHook = createAuthMiddleware(signUpBeforeHookBody);
