import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/infrastructure/better-auth/auth', () => ({
	auth: { api: { getSession: vi.fn() } },
}));

vi.mock('../../../src/env', () => ({
	env: {
		OTP_TTL_SECONDS: 30,
		TOTP_MAX_FAILURES: 3,
		TOTP_REPLAY_WINDOW_SECONDS: 60,
	},
}));

vi.mock('../../../src/shared/metrics/auth-metrics', () => ({
	recordAuthEvent: vi.fn(),
}));

vi.mock(
	'../../../src/application/use-cases/activateTwoFactor.use-case',
	() => ({ activateTwoFactor: vi.fn().mockResolvedValue(undefined) }),
);

vi.mock('better-auth/cookies', () => ({
	setSessionCookie: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../../src/shared/logger/audit-logger', () => ({
	auditLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() },
}));

import { APIError } from 'better-auth';
import { setSessionCookie } from 'better-auth/cookies';
import { activateTwoFactor } from '../../../src/application/use-cases/activateTwoFactor.use-case';
import { auth } from '../../../src/infrastructure/better-auth/auth';
import { TwoFactorVerifyTotpHook } from '../../../src/infrastructure/hooks/two-factor-verify-totp.hook';
import { recordAuthEvent } from '../../../src/shared/metrics/auth-metrics';

const activateTwoFactorMock = activateTwoFactor as ReturnType<typeof vi.fn>;
const setSessionCookieMock = setSessionCookie as ReturnType<typeof vi.fn>;

const getSessionMock = auth.api.getSession as ReturnType<typeof vi.fn>;

function buildDeps({
	replayExists = false,
	bruteForceCount = 0,
}: {
	replayExists?: boolean;
	bruteForceCount?: number;
} = {}) {
	const redis = {
		get: vi.fn().mockResolvedValue(replayExists ? '1' : null),
		set: vi.fn().mockResolvedValue('OK'),
	};
	const bruteForce = {
		getCount: vi.fn().mockResolvedValue(bruteForceCount),
		increment: vi.fn().mockResolvedValue(bruteForceCount + 1),
		clear: vi.fn().mockResolvedValue(undefined),
	};
	const twoFactorAuditLog = {
		insertEvent: vi.fn().mockResolvedValue(undefined),
	};
	const uow = { run: vi.fn() };
	return { redis, bruteForce, twoFactorAuditLog, uow };
}

function makeHook(deps: ReturnType<typeof buildDeps>) {
	return new TwoFactorVerifyTotpHook(
		deps.redis as never,
		deps.bruteForce as never,
		deps.twoFactorAuditLog as never,
		deps.uow as never,
	);
}

function makeCtx(code = '123456') {
	const headers: Record<string, string> = {
		'x-correlation-id': 'corr-1',
		'user-agent': 'test-agent',
	};
	const context: Record<string, unknown> = {};
	return {
		request: new Request('http://localhost/two-factor/verify-totp', {
			headers,
		}),
		getHeader: (name: string) => headers[name] ?? null,
		body: { code },
		context,
	};
}

describe('TwoFactorVerifyTotpHook', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
	});

	describe('before (Task 2a: lock check + anti-replay check)', () => {
		it('allows verify when brute force count < TOTP_MAX_FAILURES', async () => {
			const deps = buildDeps({ bruteForceCount: 2 });
			const hook = makeHook(deps);

			await expect(hook.before(makeCtx() as never)).resolves.toBeUndefined();

			expect(deps.bruteForce.getCount).toHaveBeenCalledWith(
				'2fa_challenge:user-1',
			);
		});

		it('throws APIError 429 when brute force count >= TOTP_MAX_FAILURES', async () => {
			const deps = buildDeps({ bruteForceCount: 3 });
			const hook = makeHook(deps);

			const err = await hook.before(makeCtx() as never).catch((e) => e);
			expect(err).toBeInstanceOf(APIError);
			expect((err as APIError).status).toBe(429);

			expect(deps.bruteForce.getCount).toHaveBeenCalledWith(
				'2fa_challenge:user-1',
			);
		});

		it('throws APIError 422 when code hash already exists in Redis', async () => {
			const deps = buildDeps({ replayExists: true, bruteForceCount: 0 });
			const hook = makeHook(deps);

			const err = await hook.before(makeCtx() as never).catch((e) => e);
			expect(err).toBeInstanceOf(APIError);
			expect((err as APIError).status).toBe(422);
		});

		it('stores codeHash and userId in ctx.context for the after hook', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx('654321');

			await hook.before(ctx as never);

			expect(ctx.context.totpCodeHash).toBeTypeOf('string');
			expect(ctx.context.totpUserId).toBe('user-1');
		});

		it('extracts user from 2FA cookie during challenge phase', async () => {
			getSessionMock.mockResolvedValue(null);
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			const createAuthCookieMock = vi.fn((name: string) => ({
				name: `test_${name}`,
			}));
			const getSignedCookieMock = vi.fn().mockResolvedValue('signed-token');
			const findVerificationValueMock = vi.fn().mockResolvedValue({
				value: 'user-from-cookie',
			});

			ctx.context.createAuthCookie = createAuthCookieMock;
			ctx.getSignedCookie = getSignedCookieMock;
			ctx.context.internalAdapter = {
				findVerificationValue: findVerificationValueMock,
			};
			ctx.context.secret = 'test-secret';

			await expect(hook.before(ctx as never)).resolves.toBeUndefined();

			// Should check lock with the extracted user
			expect(deps.bruteForce.getCount).toHaveBeenCalledWith(
				'2fa_challenge:user-from-cookie',
			);
			// User should be stored in context
			expect(ctx.context.totpUserId).toBe('user-from-cookie');
		});
	});

	describe('after (Task 2b, 2c: counter + audit logging + metrics)', () => {
		it('clears the failure counter on successful TOTP verification', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			ctx.context.returned = { user: { id: 'user-1' } };
			ctx.context.totpUserId = 'user-1';
			ctx.context.totpCodeHash = 'hash123';

			await hook.after(ctx as never);

			expect(deps.bruteForce.clear).toHaveBeenCalledWith(
				'2fa_challenge:user-1',
			);
		});

		it('logs success audit event on successful TOTP verification', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			ctx.context.returned = { user: { id: 'user-1' } };
			ctx.context.totpUserId = 'user-1';
			ctx.context.totpCodeHash = 'hash123';
			ctx.getHeader = (name: string) => {
				const headers: Record<string, string> = {
					'x-correlation-id': 'corr-1',
					'user-agent': 'test-agent',
				};
				return headers[name] ?? null;
			};

			await hook.after(ctx as never);

			expect(deps.twoFactorAuditLog.insertEvent).toHaveBeenCalledOnce();
			const auditParams = (
				deps.twoFactorAuditLog.insertEvent as ReturnType<typeof vi.fn>
			).mock.calls[0][0] as Record<string, unknown>;
			expect(auditParams.eventType).toBe('2fa_challenge_succeeded');
			expect(auditParams.userId).toBe('user-1');
			expect(auditParams.method).toBe('totp');
		});

		it('increments failure counter on failed TOTP verification', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			// Simulate failed verification - getSession returns null
			getSessionMock.mockResolvedValue(null);
			ctx.context.totpUserId = 'user-1';
			ctx.context.totpCodeHash = 'hash123';

			await hook.after(ctx as never);

			expect(deps.bruteForce.increment).toHaveBeenCalledWith(
				'2fa_challenge:user-1',
			);
		});

		it('logs failure audit event on failed TOTP verification', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			getSessionMock.mockResolvedValue(null);
			ctx.context.totpUserId = 'user-1';
			ctx.context.totpCodeHash = 'hash123';
			ctx.getHeader = (name: string) => {
				const headers: Record<string, string> = {
					'x-correlation-id': 'corr-1',
					'user-agent': 'test-agent',
				};
				return headers[name] ?? null;
			};

			await hook.after(ctx as never);

			const insertEventCalls = (
				deps.twoFactorAuditLog.insertEvent as ReturnType<typeof vi.fn>
			).mock.calls;
			const failureCall = insertEventCalls.find(
				(call) =>
					(call[0] as Record<string, unknown>).eventType ===
					'2fa_challenge_failed',
			);
			expect(failureCall).toBeDefined();
		});

		it('logs lock event on 3rd failed TOTP verification', async () => {
			const deps = buildDeps({ bruteForceCount: 2 }); // 2 + 1 = 3rd failure
			const hook = makeHook(deps);
			const ctx = makeCtx();

			getSessionMock.mockResolvedValue(null);
			ctx.context.totpUserId = 'user-1';
			ctx.context.totpCodeHash = 'hash123';
			ctx.getHeader = (name: string) => {
				const headers: Record<string, string> = {
					'x-correlation-id': 'corr-1',
					'user-agent': 'test-agent',
				};
				return headers[name] ?? null;
			};

			await hook.after(ctx as never);

			// Should log lock event in addition to failure event
			const insertEventCalls = (
				deps.twoFactorAuditLog.insertEvent as ReturnType<typeof vi.fn>
			).mock.calls;
			const lockCall = insertEventCalls.find(
				(call) =>
					(call[0] as Record<string, unknown>).eventType ===
					'2fa_challenge_locked',
			);
			expect(lockCall).toBeDefined();
		});

		it('emits success metric on successful TOTP verification', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			ctx.context.returned = { user: { id: 'user-1' } };
			ctx.context.totpUserId = 'user-1';
			ctx.context.totpCodeHash = 'hash123';

			await hook.after(ctx as never);

			expect(recordAuthEvent).toHaveBeenCalledWith('2fa_challenge_success');
		});

		it('emits failure metric on failed TOTP verification', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			getSessionMock.mockResolvedValue(null);
			ctx.context.totpUserId = 'user-1';
			ctx.context.totpCodeHash = 'hash123';

			await hook.after(ctx as never);

			expect(recordAuthEvent).toHaveBeenCalledWith('2fa_challenge_failed');
		});

		it('sets replay key in Redis for successful TOTP code', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			// before() sets totpUserId/totpCodeHash; returned signals success to after()
			await hook.before(ctx as never);
			ctx.context.returned = { user: { id: 'user-1' } };
			ctx.context.adapter = {
				findOne: vi.fn().mockResolvedValue({ secret: '' }),
			};
			await hook.after(ctx as never);

			expect(deps.redis.set).toHaveBeenCalledOnce();
			const [, , , ttl] = (deps.redis.set as ReturnType<typeof vi.fn>).mock
				.calls[0] as unknown[];
			expect(ttl).toBe(60); // env.TOTP_REPLAY_WINDOW_SECONDS (mocked as 60)
		});
	});

	describe('before — enrollment detection (totpIsEnrollment)', () => {
		it('sets totpIsEnrollment=true when active session found (enrollment path)', async () => {
			getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			await hook.before(ctx as never);

			expect(ctx.context.totpIsEnrollment).toBe(true);
		});

		it('sets totpIsEnrollment=false when using 2FA cookie (challenge path)', async () => {
			getSessionMock.mockResolvedValue(null);
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			ctx.context.createAuthCookie = vi.fn((name: string) => ({
				name: `test_${name}`,
			}));
			ctx.getSignedCookie = vi.fn().mockResolvedValue('signed-token');
			ctx.context.internalAdapter = {
				findVerificationValue: vi
					.fn()
					.mockResolvedValue({ value: 'user-from-cookie' }),
			};
			ctx.context.secret = 'test-secret';

			await hook.before(ctx as never);

			expect(ctx.context.totpIsEnrollment).toBe(false);
		});
	});

	describe('after — enrollment path (activateTwoFactor)', () => {
		beforeEach(() => {
			activateTwoFactorMock.mockResolvedValue(undefined);
			setSessionCookieMock.mockResolvedValue(undefined);
		});

		it('calls activateTwoFactor with method=totp on enrollment success', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			ctx.context.returned = { user: { id: 'user-1' } };
			ctx.context.totpUserId = 'user-1';
			ctx.context.totpCodeHash = 'hash123';
			ctx.context.totpIsEnrollment = true;
			ctx.context.adapter = {
				findOne: vi.fn().mockResolvedValue({ secret: 'secret-enc' }),
			};

			await hook.after(ctx as never);

			expect(activateTwoFactorMock).toHaveBeenCalledOnce();
			const [callDeps, callParams] = activateTwoFactorMock.mock.calls[0] as [
				Record<string, unknown>,
				Record<string, unknown>,
			];
			expect(callDeps.uow).toBe(deps.uow);
			expect(callParams.userId).toBe('user-1');
			expect((callParams.insertParams as Record<string, unknown>).method).toBe(
				'totp',
			);
		});

		it('does NOT call activateTwoFactor when challenge succeeds (totpIsEnrollment=false)', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			getSessionMock.mockResolvedValue({
				session: { token: 'tok' },
				user: { id: 'user-1' },
			});
			ctx.context.totpUserId = 'user-1';
			ctx.context.totpCodeHash = 'hash123';
			ctx.context.totpIsEnrollment = false;

			await hook.after(ctx as never);

			expect(activateTwoFactorMock).not.toHaveBeenCalled();
		});

		it('does NOT call activateTwoFactor when verification fails', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			getSessionMock.mockResolvedValue(null);
			ctx.context.totpUserId = 'user-1';
			ctx.context.totpCodeHash = 'hash123';
			ctx.context.totpIsEnrollment = true;

			await hook.after(ctx as never);

			expect(activateTwoFactorMock).not.toHaveBeenCalled();
		});

		it('compensates and rethrows on UoW failure', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();
			const updatedUser = { id: 'user-1', twoFactorEnabled: false };

			ctx.context.returned = { user: { id: 'user-1' } };
			ctx.context.totpUserId = 'user-1';
			ctx.context.totpCodeHash = 'hash123';
			ctx.context.totpIsEnrollment = true;
			ctx.context.adapter = {
				findOne: vi.fn().mockResolvedValue({ secret: 'secret-enc' }),
			};
			ctx.context.internalAdapter = {
				updateUser: vi.fn().mockResolvedValue(updatedUser),
			};
			activateTwoFactorMock.mockRejectedValueOnce(new Error('UoW failed'));

			await expect(hook.after(ctx as never)).rejects.toThrow();

			expect(
				(
					ctx.context.internalAdapter as Record<
						string,
						ReturnType<typeof vi.fn>
					>
				).updateUser,
			).toHaveBeenCalledWith('user-1', { twoFactorEnabled: false });
			// TOTP: BA already rotated the session; updateUser calls refreshUserSessions
			// internally — no cookie re-set needed
			expect(setSessionCookieMock).not.toHaveBeenCalled();
		});
	});
});
