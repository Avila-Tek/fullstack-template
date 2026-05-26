import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/shared/metrics/auth-metrics', () => ({
	recordAuthEvent: vi.fn(),
}));

vi.mock('../../../src/infrastructure/better-auth/auth', () => ({
	auth: {
		api: {
			getSession: vi.fn(),
		},
	},
}));

vi.mock('../../../src/env', () => ({
	env: {
		OTP_MAX_SENDS: 3,
		OTP_WINDOW_SECONDS: 300,
	},
}));

import { APIError } from 'better-auth';
import { auth } from '../../../src/infrastructure/better-auth/auth';
import { TwoFactorOtpRateLimitHook } from '../../../src/infrastructure/hooks/two-factor-otp-rate-limit.hook';
import { recordAuthEvent } from '../../../src/shared/metrics/auth-metrics';

const getSessionMock = vi.mocked(auth.api.getSession);

function buildRedis(count: number) {
	// The hook uses redis.pipeline().incr(key).expire(key, ttl).exec().
	// exec() returns Array<[Error | null, value]> — index 0 is the INCR result.
	const execMock = vi.fn().mockResolvedValue([
		[null, count],
		[null, 1],
	]);
	const pipelineMock = {
		incr: vi.fn().mockReturnThis(),
		expire: vi.fn().mockReturnThis(),
		exec: execMock,
	};
	return {
		redis: { pipeline: vi.fn().mockReturnValue(pipelineMock) },
		pipelineMock,
	};
}

function makeCtx({ redis }: ReturnType<typeof buildRedis>) {
	const hook = new TwoFactorOtpRateLimitHook(redis as never);
	const ctx = { request: new Request('http://localhost/two-factor/send-otp') };
	return { hook, ctx };
}

function makeChallengeCtx(
	{ redis }: ReturnType<typeof buildRedis>,
	{ cookieUserId }: { cookieUserId: string | null },
) {
	const hook = new TwoFactorOtpRateLimitHook(redis as never);
	const ctx = {
		request: new Request('http://localhost/two-factor/send-otp'),
		getSignedCookie: vi
			.fn()
			.mockResolvedValue(cookieUserId ? 'signed-token' : null),
		context: {
			secret: 'test-secret',
			createAuthCookie: vi
				.fn()
				.mockReturnValue({ name: 'better-auth.two_factor' }),
			internalAdapter: {
				findVerificationValue: vi
					.fn()
					.mockResolvedValue(cookieUserId ? { value: cookieUserId } : null),
			},
		},
	};
	return { hook, ctx };
}

describe('TwoFactorOtpRateLimitHook', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getSessionMock.mockResolvedValue({ user: { id: 'user-1' } } as never);
	});

	it('calls pipeline().incr().expire(NX).exec() with the correct key', async () => {
		const deps = buildRedis(1);
		const { hook, ctx } = makeCtx(deps);

		await expect(hook.before(ctx as never)).resolves.toBeUndefined();

		expect(deps.redis.pipeline).toHaveBeenCalledOnce();
		expect(deps.pipelineMock.incr).toHaveBeenCalledWith('2fa_otp_send:user-1');
		// NX flag: only set TTL on the first send (fixed window anchored to first send)
		expect(deps.pipelineMock.expire).toHaveBeenCalledWith(
			'2fa_otp_send:user-1',
			expect.any(Number),
			'NX',
		);
		expect(deps.pipelineMock.exec).toHaveBeenCalledOnce();
	});

	it('allows the first send', async () => {
		const deps = buildRedis(1);
		const { hook, ctx } = makeCtx(deps);

		await expect(hook.before(ctx as never)).resolves.toBeUndefined();
	});

	it('allows the third send (at the limit boundary)', async () => {
		const deps = buildRedis(3);
		const { hook, ctx } = makeCtx(deps);

		await expect(hook.before(ctx as never)).resolves.toBeUndefined();
	});

	it('throws APIError 429 on the fourth send', async () => {
		const deps = buildRedis(4);
		const { hook, ctx } = makeCtx(deps);

		const err = await hook.before(ctx as never).catch((e) => e);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(429);
	});

	it('records the rate_limited metric when the limit is exceeded', async () => {
		const deps = buildRedis(4);
		const { hook, ctx } = makeCtx(deps);

		await hook.before(ctx as never).catch(() => undefined);

		expect(recordAuthEvent).toHaveBeenCalledWith('2fa_otp_send_rate_limited');
	});

	it('applies rate limit via 2FA cookie on the login-challenge path', async () => {
		getSessionMock.mockResolvedValue(null);
		const deps = buildRedis(1);
		const { hook, ctx } = makeChallengeCtx(deps, { cookieUserId: 'user-2' });

		await expect(hook.before(ctx as never)).resolves.toBeUndefined();

		expect(deps.pipelineMock.incr).toHaveBeenCalledWith('2fa_otp_send:user-2');
	});

	it('throws 429 on the challenge path when the limit is exceeded', async () => {
		getSessionMock.mockResolvedValue(null);
		const deps = buildRedis(4);
		const { hook, ctx } = makeChallengeCtx(deps, { cookieUserId: 'user-2' });

		const err = await hook.before(ctx as never).catch((e) => e);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(429);
	});

	it('does nothing when neither session nor 2FA cookie yields a userId', async () => {
		getSessionMock.mockResolvedValue(null);
		const deps = buildRedis(1);
		const { hook, ctx } = makeChallengeCtx(deps, { cookieUserId: null });

		await expect(hook.before(ctx as never)).resolves.toBeUndefined();

		expect(deps.redis.pipeline).not.toHaveBeenCalled();
	});
});
