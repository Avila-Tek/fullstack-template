import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/infrastructure/better-auth/auth', () => ({
	auth: { api: { getSession: vi.fn() } },
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

import { setSessionCookie } from 'better-auth/cookies';
import { activateTwoFactor } from '../../../src/application/use-cases/activateTwoFactor.use-case';
import { auth } from '../../../src/infrastructure/better-auth/auth';
import { TwoFactorVerifyOtpHook } from '../../../src/infrastructure/hooks/two-factor-verify-otp.hook';
import { recordAuthEvent } from '../../../src/shared/metrics/auth-metrics';

const getSessionMock = auth.api.getSession as ReturnType<typeof vi.fn>;
const activateTwoFactorMock = activateTwoFactor as ReturnType<typeof vi.fn>;
const setSessionCookieMock = setSessionCookie as ReturnType<typeof vi.fn>;

function buildDeps() {
	const twoFactorAuditLog = {
		insertEvent: vi.fn().mockResolvedValue(undefined),
	};
	const uow = { run: vi.fn() };
	const pendingMethod = {
		set: vi.fn().mockResolvedValue(undefined),
		get: vi.fn().mockResolvedValue(null),
		delete: vi.fn().mockResolvedValue(undefined),
	};
	return { twoFactorAuditLog, uow, pendingMethod };
}

function makeHook(deps: ReturnType<typeof buildDeps>) {
	return new TwoFactorVerifyOtpHook(
		deps.twoFactorAuditLog as never,
		deps.uow as never,
		deps.pendingMethod as never,
	);
}

function makeCtx() {
	const headers: Record<string, string> = {
		'x-correlation-id': 'corr-1',
		'user-agent': 'test-agent',
	};
	const context: Record<string, unknown> = {};
	return {
		request: new Request('http://localhost/two-factor/verify-otp', {
			headers,
		}),
		getHeader: (name: string) => headers[name] ?? null,
		body: {},
		context,
	};
}

describe('TwoFactorVerifyOtpHook', () => {
	beforeEach(() => {
		vi.clearAllMocks();
		activateTwoFactorMock.mockResolvedValue(undefined);
		setSessionCookieMock.mockResolvedValue(undefined);
	});

	describe('before — enrollment detection (otpIsEnrollment)', () => {
		it('sets otpIsEnrollment=true when active session found (enrollment path)', async () => {
			getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			await hook.before(ctx as never);

			expect(ctx.context.otpIsEnrollment).toBe(true);
		});

		it('sets otpIsEnrollment=false when using 2FA cookie (challenge path)', async () => {
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

			expect(ctx.context.otpIsEnrollment).toBe(false);
		});
	});

	describe('after (Task 3a: OTP verification logging)', () => {
		it('logs success audit event when OTP verification succeeds', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			ctx.context.returned = { user: { id: 'user-1' } };

			await hook.after(ctx as never);

			expect(deps.twoFactorAuditLog.insertEvent).toHaveBeenCalledOnce();
			const auditParams = (
				deps.twoFactorAuditLog.insertEvent as ReturnType<typeof vi.fn>
			).mock.calls[0][0] as Record<string, unknown>;
			expect(auditParams.eventType).toBe('2fa_challenge_succeeded');
			expect(auditParams.userId).toBe('user-1');
			expect(auditParams.method).toBe('otp');
			expect(auditParams.correlationId).toBe('corr-1');
		});

		it('emits success metric when OTP verification succeeds', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			ctx.context.returned = { user: { id: 'user-1' } };

			await hook.after(ctx as never);

			expect(recordAuthEvent).toHaveBeenCalledWith('2fa_challenge_success');
		});

		it('logs failure audit event when OTP verification fails', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			getSessionMock.mockResolvedValue(null);
			// Mock the 2FA cookie to extract user during failure
			ctx.context.createAuthCookie = vi.fn((name: string) => ({
				name: `test_${name}`,
			}));
			ctx.getSignedCookie = vi.fn().mockResolvedValue('signed-token-value');
			ctx.context.internalAdapter = {
				findVerificationValue: vi.fn().mockResolvedValue({
					value: 'user-1',
				}),
			};
			ctx.context.secret = 'test-secret';

			await hook.after(ctx as never);

			expect(deps.twoFactorAuditLog.insertEvent).toHaveBeenCalledOnce();
			const auditParams = (
				deps.twoFactorAuditLog.insertEvent as ReturnType<typeof vi.fn>
			).mock.calls[0][0] as Record<string, unknown>;
			expect(auditParams.eventType).toBe('2fa_challenge_failed');
			expect(auditParams.userId).toBe('user-1');
			expect(auditParams.method).toBe('otp');
		});

		it('emits failure metric when OTP verification fails', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			getSessionMock.mockResolvedValue(null);
			ctx.context.createAuthCookie = vi.fn((name: string) => ({
				name: `test_${name}`,
			}));
			ctx.getSignedCookie = vi.fn().mockResolvedValue('signed-token-value');
			ctx.context.internalAdapter = {
				findVerificationValue: vi.fn().mockResolvedValue({
					value: 'user-1',
				}),
			};
			ctx.context.secret = 'test-secret';

			await hook.after(ctx as never);

			expect(recordAuthEvent).toHaveBeenCalledWith('2fa_challenge_failed');
		});

		it('extracts user from 2FA cookie when session is null', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			getSessionMock.mockResolvedValue(null);
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

			await hook.after(ctx as never);

			expect(createAuthCookieMock).toHaveBeenCalledWith('two_factor');
			expect(getSignedCookieMock).toHaveBeenCalledWith(
				'test_two_factor',
				'test-secret',
			);
			expect(findVerificationValueMock).toHaveBeenCalledWith('signed-token');

			const auditParams = (
				deps.twoFactorAuditLog.insertEvent as ReturnType<typeof vi.fn>
			).mock.calls[0][0] as Record<string, unknown>;
			expect(auditParams.userId).toBe('user-from-cookie');
		});

		it('returns early if no userId can be determined', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			getSessionMock.mockResolvedValue(null);
			ctx.context.createAuthCookie = vi.fn((name: string) => ({
				name: `test_${name}`,
			}));
			ctx.getSignedCookie = vi.fn().mockResolvedValue(null);

			await hook.after(ctx as never);

			expect(deps.twoFactorAuditLog.insertEvent).not.toHaveBeenCalled();
		});

		it('returns early if request is not available', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			ctx.request = undefined;

			await hook.after(ctx as never);

			expect(deps.twoFactorAuditLog.insertEvent).not.toHaveBeenCalled();
		});

		it('includes IP hash in audit log', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();

			ctx.context.returned = { user: { id: 'user-1' } };

			await hook.after(ctx as never);

			const auditParams = (
				deps.twoFactorAuditLog.insertEvent as ReturnType<typeof vi.fn>
			).mock.calls[0][0] as Record<string, unknown>;
			expect(auditParams.ipHash).toBeTypeOf('string');
		});
	});

	describe('after — enrollment path (activateTwoFactor)', () => {
		function makeEnrollmentCtx() {
			const ctx = makeCtx();
			ctx.context.otpIsEnrollment = true;
			return ctx;
		}

		it('does NOT call activateTwoFactor on challenge success (otpIsEnrollment=false)', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeCtx();
			ctx.context.otpIsEnrollment = false;
			ctx.context.returned = { user: { id: 'user-1' } };

			await hook.after(ctx as never);

			expect(activateTwoFactorMock).not.toHaveBeenCalled();
			expect(deps.pendingMethod.get).not.toHaveBeenCalled();
		});

		it('calls pendingMethod.get, activateTwoFactor, and pendingMethod.delete on enrollment success', async () => {
			const deps = buildDeps();
			deps.pendingMethod.get.mockResolvedValue({ method: 'email' });
			const hook = makeHook(deps);
			const ctx = makeEnrollmentCtx();

			ctx.context.returned = { token: 'new-tok', user: { id: 'user-1' } };
			ctx.context.otpEnrollmentEmail = 'user@test.com';
			ctx.context.internalAdapter = {
				findSession: vi
					.fn()
					.mockResolvedValue({ session: { token: 'new-tok' } }),
			};

			await hook.after(ctx as never);

			expect(deps.pendingMethod.get).toHaveBeenCalledWith('user-1');
			expect(activateTwoFactorMock).toHaveBeenCalledOnce();
			const [, callParams] = activateTwoFactorMock.mock.calls[0] as [
				unknown,
				Record<string, unknown>,
			];
			expect(callParams.userId).toBe('user-1');
			expect((callParams.insertParams as Record<string, unknown>).method).toBe(
				'email',
			);
			expect(deps.pendingMethod.delete).toHaveBeenCalledWith('user-1');
		});

		it('compensates and rethrows when Redis key is missing on enrollment', async () => {
			const deps = buildDeps();
			deps.pendingMethod.get.mockResolvedValue(null);
			const hook = makeHook(deps);
			const ctx = makeEnrollmentCtx();
			const updatedUser = { id: 'user-1', twoFactorEnabled: false };

			ctx.context.returned = { token: 'new-tok', user: { id: 'user-1' } };
			ctx.context.otpEnrollmentEmail = 'user@test.com';
			ctx.context.internalAdapter = {
				findSession: vi
					.fn()
					.mockResolvedValue({ session: { token: 'new-tok' } }),
				updateUser: vi.fn().mockResolvedValue(updatedUser),
			};

			await expect(hook.after(ctx as never)).rejects.toThrow();

			expect(
				(
					ctx.context.internalAdapter as Record<
						string,
						ReturnType<typeof vi.fn>
					>
				).updateUser,
			).toHaveBeenCalledWith('user-1', { twoFactorEnabled: false });
			expect(setSessionCookieMock).toHaveBeenCalled();
		});

		it('compensates and rethrows on UoW failure', async () => {
			const deps = buildDeps();
			deps.pendingMethod.get.mockResolvedValue({ method: 'sms' });
			const hook = makeHook(deps);
			const ctx = makeEnrollmentCtx();
			const updatedUser = { id: 'user-1', twoFactorEnabled: false };

			ctx.context.returned = { token: 'new-tok', user: { id: 'user-1' } };
			ctx.context.otpEnrollmentEmail = 'user@test.com';
			ctx.context.otpEnrollmentPhone = '+584141234567';
			ctx.context.internalAdapter = {
				findSession: vi
					.fn()
					.mockResolvedValue({ session: { token: 'new-tok' } }),
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
			expect(setSessionCookieMock).toHaveBeenCalled();
			// Key must NOT be deleted before the UoW succeeds — user must be able to
			// retry verify-otp without restarting from send-otp.
			expect(deps.pendingMethod.delete).not.toHaveBeenCalled();
		});

		it('updates user phoneNumber and phoneNumberVerified on SMS enrollment success', async () => {
			const deps = buildDeps();
			deps.pendingMethod.get.mockResolvedValue({
				method: 'sms',
				phoneNumber: '04121234567',
			});
			const hook = makeHook(deps);
			const ctx = makeEnrollmentCtx();

			const updateUserMock = vi.fn().mockResolvedValue({ id: 'user-1' });
			ctx.context.returned = { token: 'new-tok', user: { id: 'user-1' } };
			ctx.context.otpEnrollmentEmail = 'user@test.com';
			ctx.context.internalAdapter = {
				findSession: vi
					.fn()
					.mockResolvedValue({ session: { token: 'new-tok' } }),
				updateUser: updateUserMock,
			};

			await hook.after(ctx as never);

			expect(updateUserMock).toHaveBeenCalledWith('user-1', {
				phoneNumber: '04121234567',
				phoneNumberVerified: true,
			});
		});

		it('does NOT update user phoneNumber on email enrollment success', async () => {
			const deps = buildDeps();
			deps.pendingMethod.get.mockResolvedValue({ method: 'email' });
			const hook = makeHook(deps);
			const ctx = makeEnrollmentCtx();

			const updateUserMock = vi.fn().mockResolvedValue({ id: 'user-1' });
			ctx.context.returned = { token: 'new-tok', user: { id: 'user-1' } };
			ctx.context.otpEnrollmentEmail = 'user@test.com';
			ctx.context.internalAdapter = {
				findSession: vi
					.fn()
					.mockResolvedValue({ session: { token: 'new-tok' } }),
				updateUser: updateUserMock,
			};

			await hook.after(ctx as never);

			expect(updateUserMock).not.toHaveBeenCalled();
		});

		it('does NOT call activateTwoFactor when verification fails (isSuccess=false)', async () => {
			const deps = buildDeps();
			const hook = makeHook(deps);
			const ctx = makeEnrollmentCtx();

			getSessionMock.mockResolvedValue(null);
			ctx.context.createAuthCookie = vi.fn((name: string) => ({
				name: `test_${name}`,
			}));
			Object.assign(ctx, { getSignedCookie: vi.fn().mockResolvedValue(null) });

			await hook.after(ctx as never);

			expect(deps.pendingMethod.get).not.toHaveBeenCalled();
			expect(activateTwoFactorMock).not.toHaveBeenCalled();
		});
	});
});
