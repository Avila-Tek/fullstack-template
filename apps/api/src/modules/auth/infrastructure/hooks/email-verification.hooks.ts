import { Inject, Injectable } from '@nestjs/common';
import type { AuthHookContext } from '@thallesp/nestjs-better-auth';
import { AfterHook, BeforeHook, Hook } from '@thallesp/nestjs-better-auth';
import { normalizeEmail } from '@zoom/utils';
import { APIError } from 'better-auth';
import { jwtVerify } from 'jose';
import { z } from 'zod';
import { AccountRepositoryPort } from '../../application/ports/out/account-repository.port';
import type { AuditLogServicePort } from '../../application/ports/out/audit-log-service.port';
import { AuditLogServicePort as AuditLogServicePortToken } from '../../application/ports/out/audit-log-service.port';
import { ChangeEmailAuditLogPort } from '../../application/ports/out/change-email-audit-log.port';
import { ChangeEmailPendingPort } from '../../application/ports/out/change-email-pending.port';
import { UserRepositoryPort } from '../../application/ports/out/user-repository.port';
import { Email } from '../../domain/value-objects/user.value-object';
import { env } from '../../env';
import { auditLogger } from '../../shared/logger/audit-logger';
import { recordAuthEvent } from '../../shared/metrics/auth-metrics';
import { emitChangeEmailTelemetry } from '../../shared/utils/emit-change-email-telemetry';
import { extractHookTelemetry } from '../../shared/utils/hook-telemetry';
import { parseReturnedStatus } from '../../shared/utils/returned-status';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type VerificationFailureEventType =
	| 'email_verification_failure_expired'
	| 'email_verification_failure_invalid'
	| 'email_verification_failure_used';

export interface EmailVerificationSuccessParams {
	userId: string;
	ipHash: string;
	userAgent: string;
	correlationId: string;
}

export interface EmailVerificationFailureParams {
	failureEventType: VerificationFailureEventType;
	ipHash: string;
	userAgent: string;
	correlationId: string;
}

export interface ResendSuccessParams {
	userId?: string;
	ipHash: string;
	userAgent: string;
	correlationId: string;
}

export interface ResendFailureParams {
	ipHash: string;
	userAgent: string;
	correlationId: string;
}

/**
 * Maps a BetterAuth error code string to one of the three permitted
 * verification failure event types.
 *
 * BetterAuth surfaces errors two ways (both handled in emailVerificationAfterMiddlewareBody):
 *   Redirect path  (callbackURL present): 302 with ?error=CODE in location header
 *   API path (no callbackURL): 4xx with body.code
 *
 * Known codes verified against better-auth@1.5.4:
 *   TOKEN_EXPIRED, TOKEN_ALREADY_USED — specific
 *   INVALID_TOKEN — generic fallback for anything else
 */
function deriveFailureEventType(
	errorCode: string,
): VerificationFailureEventType {
	if (errorCode === 'TOKEN_EXPIRED')
		return 'email_verification_failure_expired';
	if (errorCode === 'TOKEN_ALREADY_USED')
		return 'email_verification_failure_used';
	return 'email_verification_failure_invalid';
}

// ---------------------------------------------------------------------------
// Core handlers — exported for direct unit testing (no DI side-effects)
// ---------------------------------------------------------------------------

export async function handleEmailVerificationSuccess(
	params: EmailVerificationSuccessParams,
	auditLogService: Pick<AuditLogServicePort, 'logSignupEvent'>,
): Promise<void> {
	auditLogger.info({
		level: 'security',
		event: 'email_verification_success',
		userId: params.userId,
		ipHash: params.ipHash,
		userAgent: params.userAgent,
		correlationId: params.correlationId,
	});
	await auditLogService.logSignupEvent({
		correlationId: params.correlationId,
		eventType: 'email_verification_success',
		ipHash: params.ipHash,
		userAgent: params.userAgent,
		userId: params.userId,
	});
	recordAuthEvent('email_verification_succeeded');
}

export async function handleEmailVerificationFailure(
	params: EmailVerificationFailureParams,
	auditLogService: Pick<AuditLogServicePort, 'logSignupEvent'>,
): Promise<void> {
	auditLogger.warn({
		level: 'security',
		event: params.failureEventType,
		ipHash: params.ipHash,
		userAgent: params.userAgent,
		correlationId: params.correlationId,
	});
	await auditLogService.logSignupEvent({
		correlationId: params.correlationId,
		eventType: params.failureEventType,
		ipHash: params.ipHash,
		userAgent: params.userAgent,
		failureReason: params.failureEventType,
	});
	recordAuthEvent('email_verification_failed', {
		error_type: params.failureEventType,
	});
}

export async function handleResendOutcome(
	params: ResendSuccessParams,
	auditLogService: Pick<AuditLogServicePort, 'logSignupEvent'>,
): Promise<void> {
	auditLogger.info({
		level: 'security',
		event: 'email_verification_resend',
		ipHash: params.ipHash,
		userAgent: params.userAgent,
		correlationId: params.correlationId,
	});
	await auditLogService.logSignupEvent({
		correlationId: params.correlationId,
		eventType: 'email_verification_resend',
		ipHash: params.ipHash,
		userAgent: params.userAgent,
		userId: params.userId,
	});
	recordAuthEvent('verification_resend_succeeded');
}

/**
 * Handles SMTP-failure on the resend path: BetterAuth propagates the error
 * from sendVerificationEmail → caller receives an APIError on ctx.context.returned.
 *
 * No auditLogService param — spec §13 defines no DB row for this case;
 * observable via structured log + telemetry only.
 */
export function handleResendFailure(params: ResendFailureParams): void {
	auditLogger.error({
		level: 'security',
		event: 'verification_resend_failed',
		ipHash: params.ipHash,
		userAgent: params.userAgent,
		correlationId: params.correlationId,
	});
	recordAuthEvent('verification_resend_failed');
}

// ---------------------------------------------------------------------------
// Minimal context shape for testability without the full BetterAuth DI chain
// ---------------------------------------------------------------------------

export interface AfterHookCtx {
	request?: Request;
	path: string;
	getHeader: (name: string) => string | null | undefined;
	context: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Inner middleware body — exported for combined testing without NestJS DI
// ---------------------------------------------------------------------------

export async function emailVerificationAfterMiddlewareBody(
	ctx: AfterHookCtx,
	auditLogService: Pick<AuditLogServicePort, 'logSignupEvent'>,
): Promise<void> {
	if (!ctx.request) return;

	const { correlationId, userAgent, ipHash } = extractHookTelemetry(ctx);

	const returned = ctx.context.returned;

	if (ctx.path === '/verify-email') {
		// Always write the attempt row before checking the outcome
		await auditLogService.logSignupEvent({
			correlationId,
			eventType: 'email_verification_attempt',
			ipHash,
			userAgent,
		});

		const returnedObj = returned as Record<string, unknown> | null | undefined;

		// Path A — redirect (callbackURL present): BetterAuth always 302-redirects.
		// Failures carry ?error=CODE in the location header; success has no ?error.
		const headers = returnedObj?.headers as
			| { get?: (name: string) => string | null }
			| undefined;
		const location =
			typeof headers?.get === 'function' ? headers.get('location') : null;
		let redirectErrorCode: string | null = null;
		if (location) {
			try {
				redirectErrorCode = new URL(location).searchParams.get('error');
			} catch {
				// malformed URL — treat as no error param
			}
		}

		// Path B — direct API call (no callbackURL): BetterAuth returns 4xx with body.code.
		const statusCode =
			typeof returnedObj?.statusCode === 'number' ? returnedObj.statusCode : 0;
		const bodyCode = (returnedObj?.body as Record<string, unknown> | undefined)
			?.code;

		const isError = redirectErrorCode !== null || statusCode >= 400;
		const errorCode =
			redirectErrorCode ?? (typeof bodyCode === 'string' ? bodyCode : '');

		if (!isError) {
			const user = returnedObj?.user as Record<string, unknown> | undefined;
			const userId = typeof user?.id === 'string' ? user.id : '';
			await handleEmailVerificationSuccess(
				{ userId, ipHash, userAgent, correlationId },
				auditLogService,
			);
		} else {
			const failureEventType = deriveFailureEventType(errorCode);
			await handleEmailVerificationFailure(
				{ failureEventType, ipHash, userAgent, correlationId },
				auditLogService,
			);
		}
		return;
	}

	if (ctx.path === '/send-verification-email') {
		const isError =
			returned !== null &&
			typeof returned === 'object' &&
			'statusCode' in (returned as object);

		if (isError) {
			handleResendFailure({ ipHash, userAgent, correlationId });
		} else {
			await handleResendOutcome(
				{ ipHash, userAgent, correlationId },
				auditLogService,
			);
		}
	}
}

// ---------------------------------------------------------------------------
// Types for discriminated email-verify context
// ---------------------------------------------------------------------------

type SignUpVerifyCtx = { type: 'sign-up' };
type ChangeEmailVerifyCtx = {
	type: 'change-email';
	userId: string;
	oldEmail: string;
	newEmail: string;
};
type EmailVerifyCtx = SignUpVerifyCtx | ChangeEmailVerifyCtx;

const jwtPayloadSchema = z.object({
	email: z.string(),
	updateTo: z.string().optional(),
	requestType: z
		.enum(['change-email-verification', 'change-email-confirmation'])
		.optional(),
});

// ---------------------------------------------------------------------------
// NestJS Hook class — registered as a provider in AppModule
// ---------------------------------------------------------------------------

@Hook()
@Injectable()
export class EmailVerificationHook {
	constructor(
		@Inject(AuditLogServicePortToken)
		private readonly auditLogService: AuditLogServicePort,
		@Inject(AccountRepositoryPort)
		private readonly accountRepo: AccountRepositoryPort,
		@Inject(UserRepositoryPort)
		private readonly userRepo: UserRepositoryPort,
		@Inject(ChangeEmailPendingPort)
		private readonly changeEmailPendingPort: ChangeEmailPendingPort,
		@Inject(ChangeEmailAuditLogPort)
		private readonly changeEmailAuditLog: ChangeEmailAuditLogPort,
	) {}

	// NOTE: This hook decodes Better Auth's verify-email token directly so it can
	// distinguish change-email confirmations from sign-up verifications BEFORE
	// the BA handler runs. It is therefore coupled to BA's internal token shape:
	//   - HS256 signed with BETTER_AUTH_SECRET
	//   - Payload `{ email, updateTo?, requestType? }`
	// Verified against Better Auth 1.x. If a future BA upgrade changes the
	// algorithm, secret, or payload, this hook will silently fall back to the
	// sign-up branch — the warn-level audit log on jwtVerify failure surfaces
	// the regression in observability so it is not invisible.
	@BeforeHook('/verify-email')
	async handleVerifyBefore(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		const url = new URL(ctx.request.url, 'http://x');
		const token =
			url.searchParams.get('token') ??
			(ctx.body as { token?: string } | undefined)?.token;
		if (!token) return;

		let payload: ReturnType<typeof jwtPayloadSchema.safeParse> | undefined;
		try {
			const decoded = await jwtVerify(
				token,
				new TextEncoder().encode(env.BETTER_AUTH_SECRET),
				{ algorithms: ['HS256'] },
			);
			payload = jwtPayloadSchema.safeParse(decoded.payload);
		} catch (err) {
			auditLogger.warn(
				{
					event: 'verify_email_token_decode_failed',
					err: err instanceof Error ? err.message : String(err),
				},
				'BeforeHook /verify-email could not decode token — falling back to sign-up flow. ' +
					'Repeated occurrences after a Better Auth upgrade may indicate token shape changed.',
			);
			return;
		}

		const parsed = payload;
		if (!parsed.success) {
			ctx.context.emailVerifyCtx = {
				type: 'sign-up',
			} satisfies SignUpVerifyCtx;
			return;
		}

		const { email, updateTo, requestType } = parsed.data;

		if (requestType === 'change-email-verification' && updateTo) {
			let emailVo: Email;
			try {
				emailVo = Email.create(email);
			} catch {
				return;
			}

			const user = await this.userRepo.findByEmail(emailVo);
			if (!user) {
				// JWT references an email no longer assigned to any user — stale
				// because the user already changed their email after this JWT was
				// issued. Functionally identical to the OQ-03 "newer initiation"
				// case (same status, same code), so callers don't need to
				// discriminate. We don't know the userId here — leave it out of
				// the structured log.
				auditLogger.warn(
					{
						level: 'security',
						event: 'change_email_jwt_email_not_resolved',
					},
					'Change-email JWT references an email no longer in the user table, token is stale',
				);
				throw new APIError(400, { error: 'token_invalidated' });
			}

			const userId = user.id;
			const pending = await this.changeEmailPendingPort.get(userId);
			if (!pending) throw new APIError(400, { error: 'token_invalidated' });
			if (normalizeEmail(pending.newEmail) !== normalizeEmail(updateTo)) {
				throw new APIError(400, { error: 'token_invalidated' });
			}

			ctx.context.emailVerifyCtx = {
				type: 'change-email',
				userId,
				oldEmail: email,
				newEmail: updateTo,
			} satisfies ChangeEmailVerifyCtx;
			return;
		}

		ctx.context.emailVerifyCtx = { type: 'sign-up' } satisfies SignUpVerifyCtx;
	}

	@AfterHook('/verify-email')
	async handleVerify(ctx: AuthHookContext): Promise<void> {
		const verifyCtx = ctx.context.emailVerifyCtx as EmailVerifyCtx | undefined;

		if (verifyCtx?.type === 'change-email') {
			await this.handleChangeEmailVerifyAfter(ctx, verifyCtx);
			return;
		}

		await emailVerificationAfterMiddlewareBody(ctx, this.auditLogService);
	}

	@AfterHook('/send-verification-email')
	async handleResend(ctx: AuthHookContext): Promise<void> {
		await emailVerificationAfterMiddlewareBody(ctx, this.auditLogService);
	}

	private async handleChangeEmailVerifyAfter(
		ctx: AuthHookContext,
		verifyCtx: ChangeEmailVerifyCtx,
	): Promise<void> {
		const tf = extractHookTelemetry(ctx);
		const { userId, newEmail } = verifyCtx;
		const tfWithUserId = { ...tf, userId };

		const { isError } = parseReturnedStatus(ctx.context.returned);

		if (isError) {
			emitChangeEmailTelemetry('email_change_failed', 'warn', tfWithUserId, {
				auditLog: this.changeEmailAuditLog,
			});
			return;
		}

		await this.accountRepo.unlinkSocialAccountsExcept(userId, newEmail);
		emitChangeEmailTelemetry(
			'social_methods_disconnected',
			'info',
			tfWithUserId,
			{
				auditLog: this.changeEmailAuditLog,
			},
		);

		const responseHeaders = ctx.context.responseHeaders as
			| { set?: (name: string, value: string) => void }
			| undefined;
		responseHeaders?.set?.('X-Email-Changed', userId);
		responseHeaders?.set?.(
			'X-Email-Changed-New',
			Buffer.from(newEmail).toString('base64url'),
		);

		try {
			await this.changeEmailPendingPort.delete(userId);
		} catch (err: unknown) {
			auditLogger.error(
				{ event: 'email_change_pending_delete_failed', userId, err },
				'Failed to delete pending change-email record',
			);
		}

		emitChangeEmailTelemetry('email_change_completed', 'info', tfWithUserId, {
			auditLog: this.changeEmailAuditLog,
		});
	}
}
