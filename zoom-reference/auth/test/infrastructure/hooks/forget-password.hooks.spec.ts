import { APIError } from 'better-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/shared/logger/audit-logger', () => ({
	auditLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

vi.mock('../../../src/shared/metrics/auth-metrics', () => ({
	recordAuthEvent: vi.fn(),
}));

import type { CaptchaServicePort } from '../../../src/application/ports/out/captcha-service.port';
import type { PasswordResetAuditLogPort } from '../../../src/application/ports/out/password-reset-audit-log.port';
import type { PasswordResetRateLimitPort } from '../../../src/application/ports/out/password-reset-rate-limit.port';
import type { UserRepositoryPort } from '../../../src/application/ports/out/user-repository.port';
import { User } from '../../../src/domain/entities/user.entity';
import { Email } from '../../../src/domain/value-objects/user.value-object';
import { ForgetPasswordHook } from '../../../src/infrastructure/hooks/forget-password.hooks';
import { recordAuthEvent } from '../../../src/shared/metrics/auth-metrics';

const VALID_BODY = {
	email: 'user@example.com',
	captchaToken: 'tok-abc',
	captchaVersion: 'v3' as const,
};

function makeCtx(
	overrides: {
		body?: object;
		hasRequest?: boolean;
		headers?: Record<string, string>;
	} = {},
	// biome-ignore lint/suspicious/noExplicitAny: structural mock
): any {
	const headers: Record<string, string> = overrides.headers ?? {
		'user-agent': 'test-agent',
		'x-forwarded-for': '1.2.3.4',
	};
	return {
		request:
			overrides.hasRequest === false
				? undefined
				: ({ method: 'POST' } as unknown as Request),
		path: '/forget-password',
		body: overrides.body ?? VALID_BODY,
		context: {},
		getHeader: (name: string) => headers[name.toLowerCase()] ?? null,
	};
}

async function catchError(fn: () => Promise<unknown>): Promise<unknown> {
	try {
		await fn();
	} catch (e) {
		return e;
	}
	return undefined;
}

describe('ForgetPasswordHook.before()', () => {
	let captchaService: CaptchaServicePort;
	let rateLimiter: PasswordResetRateLimitPort;
	let auditLog: PasswordResetAuditLogPort;
	let userRepository: UserRepositoryPort;

	beforeEach(() => {
		vi.clearAllMocks();
		captchaService = {
			verify: vi.fn().mockResolvedValue({ success: true, score: 0.9 }),
		};
		rateLimiter = {
			hitEmail: vi.fn().mockResolvedValue({ allowed: true, remaining: 2 }),
		};
		auditLog = { log: vi.fn().mockResolvedValue(undefined) };
		userRepository = {
			findById: vi.fn().mockResolvedValue(null),
			findByEmail: vi.fn().mockResolvedValue(
				User.reconstitute({
					id: 'user-1',
					email: Email.create('user@example.com'),
					emailVerified: true,
				}),
			),
			findByNormalizedEmail: vi.fn().mockResolvedValue(null),
			save: vi.fn(),
			updateSessionInvalidBefore: vi.fn(),
			updateTwoFactorEnabled: vi.fn(),
			createProvisioned: vi.fn(),
			markEmailVerified: vi.fn(),
		};
	});

	function makeHook(): ForgetPasswordHook {
		return new ForgetPasswordHook(
			captchaService,
			rateLimiter,
			auditLog,
			userRepository,
		);
	}

	it('returns early when ctx.request is absent', async () => {
		await makeHook().before(makeCtx({ hasRequest: false }));
		expect(auditLog.log).not.toHaveBeenCalled();
	});

	it('throws 422 invalid input when captcha token is missing', async () => {
		const err = await catchError(() =>
			makeHook().before(
				makeCtx({ body: { email: 'user@example.com', captchaToken: '' } }),
			),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
	});

	it('throws 503 captcha_api_unavailable when captcha provider is down', async () => {
		(captchaService.verify as ReturnType<typeof vi.fn>).mockResolvedValue({
			success: false,
			unavailable: true,
		});

		const err = await catchError(() => makeHook().before(makeCtx()));

		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(503);
		expect((err as APIError).body).toMatchObject({
			error: 'captcha_api_unavailable',
		});
	});

	it('throws 422 captcha_failed when captcha verification fails', async () => {
		(captchaService.verify as ReturnType<typeof vi.fn>).mockResolvedValue({
			success: false,
		});

		const err = await catchError(() => makeHook().before(makeCtx()));

		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
		expect((err as APIError).body).toMatchObject({ error: 'captcha_failed' });
	});

	it('throws 429 rate_limit_email when per-email limit is exceeded and emits full telemetry', async () => {
		(rateLimiter.hitEmail as ReturnType<typeof vi.fn>).mockResolvedValue({
			allowed: false,
			retryAfterSeconds: 60,
		});

		const err = await catchError(() => makeHook().before(makeCtx()));

		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(429);
		expect((err as APIError).body).toMatchObject({ error: 'rate_limit_email' });
		expect(auditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'password_reset_rate_limited' }),
		);
		expect(recordAuthEvent).toHaveBeenCalledWith('password_reset_rate_limited');
	});

	it('emits full telemetry for password_reset_requested on a valid request', async () => {
		await makeHook().before(makeCtx());

		expect(auditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'password_reset_requested',
				userId: 'user-1',
			}),
		);
		expect(recordAuthEvent).toHaveBeenCalledWith('password_reset_requested');
	});

	it('audits password_reset_requested even when the email is unknown', async () => {
		(userRepository.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(
			null,
		);

		await makeHook().before(makeCtx());

		expect(auditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'password_reset_requested',
				userId: undefined,
			}),
		);
	});
});
