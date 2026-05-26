import { Inject, Injectable } from '@nestjs/common';
import type { AuthHookContext } from '@thallesp/nestjs-better-auth';
import { BeforeHook, Hook } from '@thallesp/nestjs-better-auth';
import { forgetPasswordInput, type TForgetPasswordInput } from '@zoom/schemas';
import { normalizeEmail } from '@zoom/utils';
import { APIError } from 'better-auth';
import { CaptchaServicePort } from '../../application/ports/out/captcha-service.port';
import { PasswordResetAuditLogPort } from '../../application/ports/out/password-reset-audit-log.port';
import { PasswordResetRateLimitPort } from '../../application/ports/out/password-reset-rate-limit.port';
import { UserRepositoryPort } from '../../application/ports/out/user-repository.port';
import { Email } from '../../domain/value-objects/user.value-object';
import { emitPasswordResetTelemetry } from '../../shared/utils/emit-audit-telemetry';
import { extractHookTelemetry } from '../../shared/utils/hook-telemetry';
import { sha256Hex } from '../../shared/utils/sha256-hex';

@Hook()
@Injectable()
export class ForgetPasswordHook {
	constructor(
		@Inject(CaptchaServicePort)
		private readonly captchaService: CaptchaServicePort,
		@Inject(PasswordResetRateLimitPort)
		private readonly rateLimiter: PasswordResetRateLimitPort,
		@Inject(PasswordResetAuditLogPort)
		private readonly auditLog: PasswordResetAuditLogPort,
		@Inject(UserRepositoryPort)
		private readonly userRepository: UserRepositoryPort,
	) {}

	@BeforeHook('/request-password-reset')
	async before(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		const tf = extractHookTelemetry(ctx);

		const body = this.parseBody(ctx.body);
		await this.verifyCaptcha(body.captchaToken, body.captchaVersion);

		const emailHash = sha256Hex(normalizeEmail(body.email));

		const rateResult = await this.rateLimiter.hitEmail(emailHash);
		if (!rateResult.allowed) {
			emitPasswordResetTelemetry(
				'password_reset_rate_limited',
				'warn',
				{ ...tf, emailHash },
				{ auditLog: this.auditLog },
			);
			throw new APIError(429, {
				error: 'rate_limit_email',
				retryAfterSeconds: rateResult.retryAfterSeconds,
			});
		}

		const user = await this.userRepository.findByEmail(
			Email.create(body.email),
		);

		emitPasswordResetTelemetry(
			'password_reset_requested',
			'info',
			{ ...tf, userId: user?.id, emailHash },
			{ auditLog: this.auditLog },
		);
	}

	private parseBody(raw: unknown): TForgetPasswordInput {
		const result = forgetPasswordInput.safeParse(raw ?? {});
		if (result.success) return result.data;
		const field = result.error.issues[0]?.path[0];
		if (field === 'captchaToken') {
			throw new APIError(422, { error: 'captcha_token_required' });
		}
		if (field === 'email') {
			throw new APIError(422, { error: 'invalid_email' });
		}
		throw new APIError(422, { error: 'invalid_input' });
	}

	private async verifyCaptcha(
		token: string,
		version: 'v2' | 'v3' | undefined,
	): Promise<void> {
		const result = await this.captchaService.verify(token, version ?? 'v3');
		if (result.success) return;
		if (result.unavailable) {
			throw new APIError(503, { error: 'captcha_api_unavailable' });
		}
		if (result.challenge === 'v2') {
			throw new APIError(403, { error: 'captcha_challenge', challenge: 'v2' });
		}
		throw new APIError(422, { error: 'captcha_failed' });
	}
}
