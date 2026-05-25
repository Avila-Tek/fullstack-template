import { Inject, Injectable } from '@nestjs/common';
import type { AuthHookContext } from '@thallesp/nestjs-better-auth';
import { AfterHook, BeforeHook, Hook } from '@thallesp/nestjs-better-auth';
import { signUpInput } from '@zoom/schemas';
import { APIError } from 'better-auth';
import { CaptchaServicePort } from '@/application/ports/out/captcha-service.port';
import { SystemKeyPort } from '@/application/ports/out/system-key-service.port';
import {
	AuditLogServicePort,
	type SignupEventType,
} from '../../application/ports/out/audit-log-service.port';
import { PendingTermsStorePort } from '../../application/ports/out/pending-terms-store.port';
import { TermsRepositoryPort } from '../../application/ports/out/terms-repository.port';
import { UserRepositoryPort } from '../../application/ports/out/user-repository.port';
import { UserTermsAcceptanceRepositoryPort } from '../../application/ports/out/user-terms-acceptance-repository.port';
import { Email } from '../../domain/value-objects/user.value-object';
import { auditLogger } from '../../shared/logger/audit-logger';
import { recordAuthEvent } from '../../shared/metrics/auth-metrics';
import { extractHookTelemetry } from '../../shared/utils/hook-telemetry';
import { extractSystemKey } from '../system-key/system-key.utils';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface SignUpBody {
	email?: unknown;
	password?: unknown;
	captchaToken?: unknown;
	captchaVersion?: unknown;
	termsAccepted?: unknown;
	systemTermsId?: unknown;
}

// ---------------------------------------------------------------------------
// NestJS Hook class — registered as a provider in AppModule
// ---------------------------------------------------------------------------

@Hook()
@Injectable()
export class SignUpHook {
	constructor(
		@Inject(TermsRepositoryPort)
		private readonly termsRepository: TermsRepositoryPort,
		@Inject(CaptchaServicePort)
		private readonly captchaService: CaptchaServicePort,
		@Inject(AuditLogServicePort)
		private readonly auditLogService: AuditLogServicePort,
		@Inject(UserRepositoryPort)
		private readonly userRepository: UserRepositoryPort,
		@Inject(SystemKeyPort)
		private readonly systemKeyService: SystemKeyPort,
		@Inject(PendingTermsStorePort)
		private readonly pendingTermsStore: PendingTermsStorePort,
		@Inject(UserTermsAcceptanceRepositoryPort)
		private readonly termsAcceptanceRepo: UserTermsAcceptanceRepositoryPort,
	) {}

	@BeforeHook('/sign-up/email')
	async beforeSignUp(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		const {
			correlationId,
			ipAddress: ip,
			userAgent,
			ipHash,
		} = extractHookTelemetry(ctx);

		const systemId = await this.getSystemId(ctx);

		this.logAttempt(correlationId, ipHash, userAgent);

		try {
			await this.validateSignUp(
				ctx.body as SignUpBody,
				systemId,
				ip,
				userAgent,
				correlationId,
			);
			ctx.context.correlationId = correlationId;
			ctx.context.auditLogService = this.auditLogService;
		} catch (err) {
			this.logFailure(correlationId, ipHash, userAgent, err);
			throw err;
		}
	}

	// ── After hook ─────────────────────────────────────────────────────────────
	//
	// GAP-6: write the authoritative user_terms_acceptance record once the user
	// row exists. The userId is forwarded via ctx.context.createdUserId by
	// databaseHooks.user.create.after in auth.ts.

	@AfterHook('/sign-up/email')
	async afterSignUp(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		const correlationId =
			typeof ctx.context.correlationId === 'string'
				? ctx.context.correlationId
				: undefined;
		if (!correlationId) return;

		const { userAgent, ipHash } = extractHookTelemetry(ctx);

		// userId is set by databaseHooks.user.create.after in auth.ts.
		// Absent when user creation was aborted (e.g. DB constraint violation).
		const userId =
			typeof ctx.context.createdUserId === 'string'
				? ctx.context.createdUserId
				: undefined;
		if (!userId) {
			this.logFailure(correlationId, ipHash, userAgent, undefined);
			return;
		}

		// Non-atomic consume: null means already consumed or expired — treat as no-op.
		const entry = await this.pendingTermsStore.consume(correlationId);
		if (!entry) return;

		// ipAddress coerced to null — the inet column rejects empty strings.
		await this.termsAcceptanceRepo.create({
			userId,
			systemId: entry.systemId,
			systemTermsId: entry.systemTermsId,
			sessionId: null,
			ipAddress:
				entry.ipAddress && entry.ipAddress !== 'unknown'
					? entry.ipAddress
					: null,
			userAgent: entry.userAgent || null,
		});

		this.logSuccess(correlationId, ipHash, userAgent, userId);
	}

	private async getSystemId(ctx: AuthHookContext): Promise<string> {
		const key = extractSystemKey((name) => ctx.getHeader(name) ?? undefined);

		if (!key) {
			throw new APIError(401, { error: 'missing_system_key' });
		}

		const resolution = await this.systemKeyService.resolveSystemId(key);
		if (!resolution) {
			throw new APIError(401, { error: 'invalid_system_key' });
		}

		return resolution.systemId;
	}

	private async validateSignUp(
		body: SignUpBody,
		systemId: string,
		ip: string,
		userAgent: string,
		correlationId: string,
	): Promise<void> {
		this.validateInputFields(body);

		const emailStr = typeof body.email === 'string' ? body.email : '';
		try {
			const emailVo = Email.create(emailStr);
			const existing = await this.userRepository.findByEmail(emailVo);
			if (existing) {
				throw new APIError(409, { error: 'email_already_in_use' });
			}
		} catch (err) {
			if (err instanceof APIError) throw err;
			// Email.create throws only on malformed input — already caught by validateInputFields
		}

		await this.verifyCaptcha(body);
		const systemTermsId = await this.verifyTermsVersion(body, systemId);

		// Store T&C data in Redis keyed by correlationId so the databaseHooks
		// callback in auth.ts can retrieve it via ctx.context.pendingTermsStore.
		await this.pendingTermsStore.set(correlationId, {
			systemTermsId,
			systemId,
			provider: 'email',
			ipAddress: ip,
			userAgent,
			termsAcceptedAt: new Date().toISOString(),
		});
	}

	private validateInputFields(body: SignUpBody): void {
		const result = signUpInput.safeParse(body);
		if (result.success) return;

		const field = result.error.issues[0]?.path[0];
		const message = result.error.issues[0]?.message;

		if (field === 'captchaToken') {
			throw new APIError(422, { error: 'captcha_token_required' });
		}
		if (field === 'termsAccepted') {
			throw new APIError(422, { error: 'terms_not_accepted' });
		}
		if (field === 'systemTermsId') {
			throw new APIError(422, { error: 'terms_version_mismatch' });
		}
		if (field === 'email') {
			throw new APIError(422, { error: 'invalid_email' });
		}
		if (field === 'password') {
			throw new APIError(422, { error: 'credentials_too_weak', message });
		}
		throw new APIError(422, { error: 'invalid_input' });
	}

	private async verifyCaptcha(body: SignUpBody): Promise<void> {
		const captchaToken =
			typeof body.captchaToken === 'string' ? body.captchaToken : '';
		const captchaVersion =
			body.captchaVersion === 'v2' ? ('v2' as const) : ('v3' as const);
		const result = await this.captchaService.verify(
			captchaToken,
			captchaVersion,
		);
		if (result.success) return;

		if (result.unavailable) {
			throw new APIError(503, { error: 'captcha_api_unavailable' });
		}
		if (result.challenge === 'v2') {
			throw new APIError(403, { error: 'captcha_challenge', challenge: 'v2' });
		}
		throw new APIError(422, { error: 'captcha_failed' });
	}

	private async verifyTermsVersion(
		body: SignUpBody,
		systemId: string,
	): Promise<string> {
		const submittedId =
			typeof body.systemTermsId === 'string' ? body.systemTermsId : '';
		if (!submittedId) {
			throw new APIError(422, { error: 'terms_version_mismatch' });
		}

		let systemTermsId: string | undefined;
		try {
			const record = await this.termsRepository.findActiveBySystemId(systemId);
			systemTermsId = record?.id;
		} catch {
			throw new APIError(503, { error: 'terms_version_unavailable' });
		}

		if (systemTermsId !== submittedId) {
			throw new APIError(422, { error: 'terms_version_mismatch' });
		}
		return systemTermsId;
	}

	private logAttempt(
		correlationId: string,
		ipHash: string,
		userAgent: string,
	): void {
		auditLogger.info({
			level: 'security',
			event: 'signup_attempt',
			correlationId,
			ipHash,
			userAgent,
			resultStatus: 'success',
		});
		this.auditLogService.logSignupEvent({
			correlationId,
			eventType: 'signup_attempt',
			ipHash,
			userAgent,
		});
	}

	private logSuccess(
		correlationId: string,
		ipHash: string,
		userAgent: string,
		userId: string,
	): void {
		auditLogger.info({
			level: 'security',
			event: 'signup_success',
			correlationId,
			ipHash,
			userAgent,
			userId,
			resultStatus: 'success',
		});
		this.auditLogService.logSignupEvent({
			correlationId,
			eventType: 'signup_success',
			ipHash,
			userAgent,
			userId,
		});
		recordAuthEvent('signup_success');
	}

	private logFailure(
		correlationId: string,
		ipHash: string,
		userAgent: string,
		err: unknown,
	): void {
		const body =
			err instanceof APIError ? (err.body as Record<string, unknown>) : {};
		const errorCode =
			typeof body.error === 'string' ? body.error : 'user_creation_failed';
		const evtType = this.failureEventType(errorCode);

		auditLogger.warn({
			level: 'security',
			event: evtType,
			correlationId,
			ipHash,
			userAgent,
			resultStatus: 'failure',
			failureReason: errorCode,
		});
		this.auditLogService.logSignupEvent({
			correlationId,
			eventType: evtType,
			ipHash,
			userAgent,
			failureReason: errorCode,
		});
		if (evtType === 'signup_failure') {
			recordAuthEvent('signup_failure', { error_type: errorCode });
		}
	}

	private failureEventType(errorCode: string): SignupEventType {
		const map: Record<string, SignupEventType> = {
			captcha_api_unavailable: 'signup_failure',
			captcha_challenge: 'signup_captcha_challenge',
			captcha_failed: 'signup_failure',
			captcha_token_required: 'signup_failure',
			credentials_too_weak: 'signup_failure',
			email_already_in_use: 'signup_duplicate_email',
			invalid_email: 'signup_failure',
			terms_not_accepted: 'signup_failure',
			terms_version_mismatch: 'signup_tc_version_mismatch',
			terms_version_unavailable: 'signup_tc_version_unavailable',
			user_creation_failed: 'signup_failure',
		};
		return map[errorCode] ?? 'signup_failure';
	}
}
