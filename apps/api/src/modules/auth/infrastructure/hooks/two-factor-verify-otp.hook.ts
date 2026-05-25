import { Inject, Injectable } from '@nestjs/common';
import {
	AfterHook,
	type AuthHookContext,
	BeforeHook,
	Hook,
} from '@thallesp/nestjs-better-auth';
import { APIError } from 'better-auth';
import { TwoFactorActivateUnitOfWorkPort } from '../../application/ports/out/two-factor-activate-unit-of-work.port';
import type { TwoFactorAuditLogRepositoryPort } from '../../application/ports/out/two-factor-audit-log-repository.port';
import { TwoFactorAuditLogRepositoryPort as AuditLogToken } from '../../application/ports/out/two-factor-audit-log-repository.port';
import { TwoFactorPendingMethodPort } from '../../application/ports/out/two-factor-pending-method.port';
import { activateTwoFactor } from '../../application/use-cases/activateTwoFactor.use-case';
import { auditLogger } from '../../shared/logger/audit-logger';
import { recordAuthEvent } from '../../shared/metrics/auth-metrics';
import { compensateTwoFactorEnable } from '../../shared/utils/compensate-two-factor-enable';
import { extractHookTelemetry } from '../../shared/utils/hook-telemetry';
import { auth } from '../better-auth/auth';

// Shape of the BA session user relevant to OTP enrollment.
// BA does not publicly export its User type, so we name the subset we consume.
type BaSessionUser = { email: string; phoneNumber?: string };

// Shape of the value BA writes to ctx.context.returned on a successful verify.
// This is a runtime-only field set by BA hooks, not part of the typed AuthContext.
type ReturnedShape = {
	token?: string;
	user?: { id: string; [key: string]: unknown };
};

function isReturnedShape(v: unknown): v is ReturnedShape {
	if (typeof v !== 'object' || v === null) return false;
	const obj = v as Record<string, unknown>;
	if (obj.user === undefined) return true;
	return (
		typeof obj.user === 'object' &&
		obj.user !== null &&
		typeof (obj.user as Record<string, unknown>).id === 'string'
	);
}

@Hook()
@Injectable()
export class TwoFactorVerifyOtpHook {
	constructor(
		@Inject(AuditLogToken)
		private readonly twoFactorAuditLog: TwoFactorAuditLogRepositoryPort,
		@Inject(TwoFactorActivateUnitOfWorkPort)
		private readonly uow: TwoFactorActivateUnitOfWorkPort,
		@Inject(TwoFactorPendingMethodPort)
		private readonly pendingMethod: TwoFactorPendingMethodPort,
	) {}

	@BeforeHook('/two-factor/verify-otp')
	async before(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;
		const result = await auth.api.getSession({ headers: ctx.request.headers });
		ctx.context.otpIsEnrollment = result !== null;
		if (result) {
			// Store contact info before BA deletes the session during enrollment.
			// result.user is User & Record<string, any> — cast to our named subset.
			const user = result.user as BaSessionUser;
			ctx.context.otpEnrollmentEmail = user.email;
			ctx.context.otpEnrollmentPhone = user.phoneNumber;
		}
	}

	@AfterHook('/two-factor/verify-otp')
	async after(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		const otpIsEnrollment = ctx.context.otpIsEnrollment as boolean | undefined;
		const { correlationId, userAgent, ipHash } = extractHookTelemetry(ctx);

		// BA deletes the old session and writes a new token in the response body on
		// enrollment success — ctx.responseHeaders is the endpoint's headers, not the
		// hook's, so getSession() from headers always returns null here.
		// Read returned instead, same pattern as sign-in.hooks.ts.
		const returned = isReturnedShape(ctx.context.returned)
			? (ctx.context.returned as ReturnedShape)
			: undefined;
		const returnedUserId = returned?.user?.id;
		const isSuccess = typeof returnedUserId === 'string';

		let userId: string | undefined;

		if (isSuccess) {
			userId = returnedUserId;
		} else {
			// Failure path: identify user for audit log
			// Challenge failure: read from 2FA cookie
			const twoFactorCookieName =
				ctx.context.createAuthCookie('two_factor').name;
			const signedTwoFactorCookie = await ctx.getSignedCookie(
				twoFactorCookieName,
				ctx.context.secret,
			);
			if (signedTwoFactorCookie) {
				const verificationToken =
					await ctx.context.internalAdapter.findVerificationValue(
						signedTwoFactorCookie,
					);
				if (verificationToken) userId = verificationToken.value;
			}
			// Enrollment failure: BA hasn't deleted the session yet, request headers still valid
			if (!userId && otpIsEnrollment) {
				const result = await auth.api.getSession({
					headers: ctx.request.headers,
				});
				userId = result?.user.id;
			}
		}

		if (!userId) return;

		if (isSuccess && otpIsEnrollment) {
			try {
				await this.handleEnrollmentActivation(
					ctx,
					userId,
					correlationId,
					ipHash,
					userAgent,
					returned?.token ?? '',
				);
			} catch (err: unknown) {
				void this.twoFactorAuditLog
					.insertEvent({
						eventType: '2fa_enrollment_failed',
						userId,
						correlationId,
						method: 'otp',
						ipHash,
						userAgent,
					})
					.catch(() => undefined);
				auditLogger.warn({
					level: 'security',
					event: '2fa_enrollment_failed',
					method: 'otp',
					userId,
					ipHash,
					userAgent,
					correlationId,
				});
				recordAuthEvent('2fa_enrollment_failed');
				throw err;
			}
			return;
		}

		// Enrollment failure path
		if (!isSuccess && otpIsEnrollment) {
			void this.twoFactorAuditLog
				.insertEvent({
					eventType: '2fa_enrollment_failed',
					userId,
					correlationId,
					method: 'otp',
					ipHash,
					userAgent,
				})
				.catch(() => undefined);
			auditLogger.warn({
				level: 'security',
				event: '2fa_enrollment_failed',
				method: 'otp',
				userId,
				ipHash,
				userAgent,
				correlationId,
			});
			recordAuthEvent('2fa_enrollment_failed');
			return;
		}

		// Challenge path: audit log (fire-and-forget)
		const eventType = isSuccess
			? '2fa_challenge_succeeded'
			: '2fa_challenge_failed';
		const metric = isSuccess ? '2fa_challenge_success' : '2fa_challenge_failed';

		void this.twoFactorAuditLog
			.insertEvent({
				eventType,
				userId,
				correlationId,
				method: 'otp',
				ipHash,
				userAgent,
			})
			.catch(() => undefined);

		auditLogger[isSuccess ? 'info' : 'warn']({
			level: 'security',
			event: eventType,
			method: 'otp',
			userId,
			ipHash,
			userAgent,
			correlationId,
		});
		recordAuthEvent(metric);
	}

	private async handleEnrollmentActivation(
		ctx: AuthHookContext,
		userId: string,
		correlationId: string,
		ipHash: string,
		userAgent: string,
		newSessionToken: string,
	): Promise<void> {
		// ctx.context.internalAdapter is typed as InternalAdapter by BA's AuthContext.
		// findSession is part of that interface — no cast needed.
		const found =
			await ctx.context.internalAdapter.findSession(newSessionToken);

		const pending = await this.pendingMethod.get(userId);
		if (!pending) {
			await compensateTwoFactorEnable(ctx, userId, found?.session);
			throw new APIError(500, {
				error: '2fa_pending_method_missing',
			});
		}

		const insertParams = {
			method: pending.method,
			verifiedAt: new Date(),
		};

		try {
			await activateTwoFactor(
				{ uow: this.uow, correlationId, ipHash, userAgent },
				{ userId, insertParams },
			);
			// SMS enrollment: persist phoneNumber + phoneNumberVerified on the user record
			if (pending.method === 'sms' && pending.phoneNumber) {
				const adapter = ctx.context.internalAdapter as {
					updateUser: (
						id: string,
						data: Record<string, unknown>,
					) => Promise<unknown>;
				};
				await adapter.updateUser(userId, {
					phoneNumber: pending.phoneNumber,
					phoneNumberVerified: true,
				});
			}
			// Delete only after UoW succeeds — if it fails the key stays intact so
			// the user can retry verify-otp without restarting from send-otp.
			await this.pendingMethod.delete(userId);
		} catch (err) {
			await compensateTwoFactorEnable(ctx, userId, found?.session);
			throw err;
		}

		void this.twoFactorAuditLog
			.insertEvent({
				eventType: '2fa_enrollment_succeeded',
				userId,
				correlationId,
				method: insertParams.method,
				ipHash,
				userAgent,
			})
			.catch(() => undefined);

		auditLogger.info({
			level: 'security',
			event: '2fa_enrollment_succeeded',
			method: insertParams.method,
			userId,
			ipHash,
			userAgent,
			correlationId,
		});
		recordAuthEvent('2fa_enrollment_succeeded');
	}
}
