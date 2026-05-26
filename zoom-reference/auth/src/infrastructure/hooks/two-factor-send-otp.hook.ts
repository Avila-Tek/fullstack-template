import { Inject, Injectable } from '@nestjs/common';
import {
	AfterHook,
	type AuthHookContext,
	BeforeHook,
	Hook,
} from '@thallesp/nestjs-better-auth';
import { APIError } from 'better-auth';
import { EmailServicePort } from '../../application/ports/out/email-service.port';
import { SmsServicePort } from '../../application/ports/out/sms-service.port';
import type { TwoFactorAuditLogRepositoryPort } from '../../application/ports/out/two-factor-audit-log-repository.port';
import { TwoFactorAuditLogRepositoryPort as AuditLogToken } from '../../application/ports/out/two-factor-audit-log-repository.port';
import { TwoFactorPendingMethodPort } from '../../application/ports/out/two-factor-pending-method.port';
import { TwoFactorRepositoryPort } from '../../application/ports/out/two-factor-repository.port';
import { env } from '../../env';
import { auditLogger } from '../../shared/logger/audit-logger';
import { recordAuthEvent } from '../../shared/metrics/auth-metrics';
import { extractHookTelemetry } from '../../shared/utils/hook-telemetry';
import { auth } from '../better-auth/auth';

const VALID_METHODS = ['email', 'sms'] as const;
type OtpMethod = (typeof VALID_METHODS)[number];

const VE_PHONE_REGEX = /^04\d{9}$/;

@Hook()
@Injectable()
export class TwoFactorSendOtpHook {
	constructor(
		@Inject(EmailServicePort)
		private readonly emailService: EmailServicePort,
		@Inject(SmsServicePort)
		private readonly smsService: SmsServicePort,
		@Inject(AuditLogToken)
		private readonly twoFactorAuditLog: TwoFactorAuditLogRepositoryPort,
		@Inject(TwoFactorPendingMethodPort)
		private readonly pendingMethod: TwoFactorPendingMethodPort,
		@Inject(TwoFactorRepositoryPort)
		private readonly twoFactorRepo: TwoFactorRepositoryPort,
	) {}

	@BeforeHook('/two-factor/send-otp')
	async before(ctx: AuthHookContext): Promise<void> {
		const body = ctx.body as
			| { method?: string; phoneNumber?: string }
			| undefined;
		const rawMethod = body?.method;

		// Detect enrollment (active session) vs challenge (no session, 2FA cookie)
		const isEnrollment = ctx.request
			? (await auth.api.getSession({ headers: ctx.request.headers })) !== null
			: false;

		let resolvedMethod: OtpMethod;

		if (isEnrollment) {
			// Enrollment: honour body.method, fall back to cookie lookup
			if (rawMethod !== undefined) {
				if (!VALID_METHODS.includes(rawMethod as OtpMethod)) {
					throw new APIError(400, {
						message: 'method must be "email" or "sms"',
					});
				}
				resolvedMethod = rawMethod as OtpMethod;
			} else {
				resolvedMethod = await this.resolveMethodFromCookie(ctx);
			}

			// Enrollment SMS: extract and validate phone from body
			if (resolvedMethod === 'sms') {
				const phoneNumber = body?.phoneNumber;
				if (!phoneNumber || !VE_PHONE_REGEX.test(phoneNumber)) {
					throw new APIError(400, {
						message:
							'phoneNumber is required for SMS enrollment and must be a valid Venezuelan mobile number (04XX-NNNNNNN)',
					});
				}
				ctx.context.enrollmentPhoneNumber = phoneNumber;
			}
		} else {
			// Challenge: enforce stored method — ignore body.method
			resolvedMethod = await this.resolveMethodFromCookie(ctx, true);
		}

		// Store chosen method so auth.ts sendOTP can route to the right sender.
		ctx.context.otpMethod = resolvedMethod;
		ctx.context.sendEmailOTP = async (
			email: string,
			otp: string,
		): Promise<void> => {
			try {
				await this.emailService.sendTwoFactorOtpEmail(email, otp);
			} catch (err) {
				const outerMeta = (err as { meta?: Record<string, unknown> })?.meta;
				const innerMeta = (
					outerMeta?.cause as { meta?: Record<string, unknown> }
				)?.meta;
				auditLogger.error(
					{
						event: '2fa.send_otp.email_delivery_failed',
						errorName: (err as Error)?.constructor?.name,
						providerReason: innerMeta?.reason,
						providerStep: innerMeta?.step,
						providerCodrespuesta: innerMeta?.codrespuesta,
					},
					'2FA OTP email delivery failed',
				);
				throw new APIError(500, { error: 'otp_delivery_failed' });
			}
		};
		ctx.context.sendPhoneOTP = async (
			phone: string,
			otp: string,
		): Promise<void> => {
			try {
				await this.smsService.sendTwoFactorOtpSms(phone, otp);
			} catch (err) {
				auditLogger.error(
					{
						event: '2fa.send_otp.sms_delivery_failed',
						errorName: (err as Error)?.constructor?.name,
					},
					'2FA OTP SMS delivery failed',
				);
				throw new APIError(500, { error: 'otp_delivery_failed' });
			}
		};
	}

	@AfterHook('/two-factor/send-otp')
	async afterSendOtp(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		const { correlationId, userAgent, ipHash } = extractHookTelemetry(ctx);

		// Enrollment path: active session means the user is enabling 2FA, not challenging
		const session = await auth.api.getSession({ headers: ctx.request.headers });

		if (session) {
			// Setup flow — enrollment, not challenge. Skip challenge audit and store pending method so verify-otp can activate the right method.
			const method = ((ctx.context.otpMethod as string) || 'email') as
				| 'email'
				| 'sms';
			const phoneNumber = ctx.context.enrollmentPhoneNumber as
				| string
				| undefined;
			await this.pendingMethod.set(
				session.user.id,
				{ method, ...(phoneNumber ? { phoneNumber } : {}) },
				env.OTP_TTL_SECONDS,
			);

			void this.twoFactorAuditLog
				.insertEvent({
					eventType: '2fa_enrollment_otp_sent',
					userId: session.user.id,
					correlationId,
					method,
					ipHash,
					userAgent,
				})
				.catch(() => undefined);

			auditLogger.info({
				level: 'security',
				event: '2fa_enrollment_otp_sent',
				method,
				userId: session.user.id,
				ipHash,
				userAgent,
				correlationId,
			});
			recordAuthEvent('2fa_enrollment_otp_sent');
			return;
		}

		// Challenge path: no active session — identify user via 2FA cookie
		const twoFactorCookieName = ctx.context.createAuthCookie('two_factor').name;
		const signedTwoFactorCookie = await ctx.getSignedCookie(
			twoFactorCookieName,
			ctx.context.secret,
		);

		let userId: string | undefined;
		if (signedTwoFactorCookie) {
			const verificationToken =
				await ctx.context.internalAdapter.findVerificationValue(
					signedTwoFactorCookie,
				);
			if (verificationToken) userId = verificationToken.value;
		}

		if (!userId) return;

		const method = (ctx.context.otpMethod as string) || 'email';

		// Fire-and-forget audit log write — do not block OTP endpoint on audit failures
		void this.twoFactorAuditLog
			.insertEvent({
				eventType: '2fa_challenge_otp_sent',
				userId,
				correlationId,
				method,
				ipHash,
				userAgent,
			})
			.catch(() => undefined);

		auditLogger.info({
			level: 'security',
			event: '2fa_challenge_otp_sent',
			method,
			userId,
			ipHash,
			userAgent,
			correlationId,
		});
		recordAuthEvent('2fa_challenge_otp_sent');
	}

	private async resolveMethodFromCookie(
		ctx: AuthHookContext,
		rejectTotp = false,
	): Promise<OtpMethod> {
		let userId: string | undefined;

		// Login challenge path: read user from 2FA cookie
		const cookieName = ctx.context.createAuthCookie('two_factor').name;
		const cookieValue = await ctx.getSignedCookie(
			cookieName,
			ctx.context.secret,
		);
		if (cookieValue) {
			const token =
				await ctx.context.internalAdapter.findVerificationValue(cookieValue);
			if (token) userId = token.value;
		}

		// Session path fallback: OTP resend from account settings (no 2FA cookie)
		if (!userId && ctx.request) {
			const session = await auth.api.getSession({
				headers: ctx.request.headers,
			});
			if (session) userId = session.user.id;
		}

		if (!userId) return 'email';

		const record = await this.twoFactorRepo.findEnabledByUserId(userId);
		if (!record) return 'email';
		if (record.method === 'totp') {
			if (rejectTotp) {
				throw new APIError(400, {
					code: 'AUTH_2FA_METHOD_MISMATCH',
					message: 'TOTP users must use verify-totp, not send-otp',
				});
			}
			return 'email';
		}
		return record.method; // 'email' | 'sms'
	}
}
