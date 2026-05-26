import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/infrastructure/better-auth/auth', () => ({
	auth: { api: { getSession: vi.fn() } },
}));

vi.mock('../../../src/shared/logger/audit-logger', () => ({
	auditLogger: {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
	},
}));

vi.mock('../../../src/shared/metrics/auth-metrics', () => ({
	recordAuthEvent: vi.fn(),
}));

vi.mock('../../../src/env', () => ({
	env: { OTP_TTL_SECONDS: 300 },
}));

import { APIError } from 'better-auth';
import { auth } from '../../../src/infrastructure/better-auth/auth';
import { TwoFactorSendOtpHook } from '../../../src/infrastructure/hooks/two-factor-send-otp.hook';
import { recordAuthEvent } from '../../../src/shared/metrics/auth-metrics';

const getSessionMock = auth.api.getSession as ReturnType<typeof vi.fn>;

function makeEmailService() {
	return { sendTwoFactorOtpEmail: vi.fn().mockResolvedValue(undefined) };
}

function makeSmsService() {
	return { sendTwoFactorOtpSms: vi.fn().mockResolvedValue(undefined) };
}

function makeTwoFactorAuditLog() {
	return { insertEvent: vi.fn().mockResolvedValue(undefined) };
}

function makePendingMethod() {
	return {
		set: vi.fn().mockResolvedValue(undefined),
		get: vi.fn().mockResolvedValue(null),
		delete: vi.fn().mockResolvedValue(undefined),
	};
}

function makeTwoFactorRepo(method: 'email' | 'sms' | 'totp' = 'email') {
	return { findEnabledByUserId: vi.fn().mockResolvedValue({ method }) };
}

function makeHook(
	emailService = makeEmailService(),
	smsService = makeSmsService(),
	twoFactorAuditLog = makeTwoFactorAuditLog(),
	pendingMethod = makePendingMethod(),
	twoFactorRepo = makeTwoFactorRepo(),
) {
	return {
		hook: new TwoFactorSendOtpHook(
			emailService as never,
			smsService as never,
			twoFactorAuditLog as never,
			pendingMethod as never,
			twoFactorRepo as never,
		),
		emailService,
		smsService,
		twoFactorAuditLog,
		pendingMethod,
		twoFactorRepo,
	};
}

function makeCtx(body: Record<string, unknown> = {}) {
	return {
		body,
		request: new Request('http://localhost/two-factor/send-otp'),
		context: {
			createAuthCookie: vi.fn((name: string) => ({ name: `test_${name}` })),
			internalAdapter: {
				findVerificationValue: vi.fn().mockResolvedValue({ value: 'user-1' }),
			},
			secret: 'test-secret',
		} as Record<string, unknown>,
		getSignedCookie: vi.fn().mockResolvedValue('signed-token'),
	};
}

function makeAfterCtx() {
	const headers: Record<string, string> = {
		'x-correlation-id': 'corr-1',
		'user-agent': 'test-agent',
	};
	const context: Record<string, unknown> = {};
	return {
		request: new Request('http://localhost/two-factor/send-otp', {
			headers,
		}),
		getHeader: (name: string) => headers[name] ?? null,
		body: {},
		context,
	};
}

describe('TwoFactorSendOtpHook', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});
	describe('method defaults via cookie lookup when not in body', () => {
		it('resolves method from user_two_factor and injects both senders', async () => {
			getSessionMock.mockResolvedValue(null);
			const { hook } = makeHook();
			const ctx = makeCtx({});

			await hook.before(ctx as never);

			expect(ctx.context.otpMethod).toBe('email');
			expect(typeof ctx.context.sendEmailOTP).toBe('function');
			expect(typeof ctx.context.sendPhoneOTP).toBe('function');
		});

		it('resolves to "sms" when active method is sms', async () => {
			getSessionMock.mockResolvedValue(null);
			const { hook } = makeHook(
				makeEmailService(),
				makeSmsService(),
				makeTwoFactorAuditLog(),
				makePendingMethod(),
				makeTwoFactorRepo('sms'),
			);
			const ctx = makeCtx({});

			await hook.before(ctx as never);

			expect(ctx.context.otpMethod).toBe('sms');
		});

		it('sendEmailOTP delegates to emailService after cookie resolution', async () => {
			getSessionMock.mockResolvedValue(null);
			const { hook, emailService } = makeHook();
			const ctx = makeCtx({});

			await hook.before(ctx as never);

			await (
				ctx.context.sendEmailOTP as (
					email: string,
					otp: string,
				) => Promise<void>
			)('user@example.com', '123456');
			expect(emailService.sendTwoFactorOtpEmail).toHaveBeenCalledWith(
				'user@example.com',
				'123456',
			);
		});
	});

	describe('method = "email"', () => {
		it('sets otpMethod=email when method is explicitly "email"', async () => {
			getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
			const { hook } = makeHook();
			const ctx = makeCtx({ method: 'email' });

			await hook.before(ctx as never);

			expect(ctx.context.otpMethod).toBe('email');
		});
	});

	describe('method = "sms"', () => {
		it('sets otpMethod=sms and injects both senders', async () => {
			getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
			const { hook } = makeHook();
			const ctx = makeCtx({ method: 'sms', phoneNumber: '04121234567' });

			await hook.before(ctx as never);

			expect(ctx.context.otpMethod).toBe('sms');
			expect(typeof ctx.context.sendEmailOTP).toBe('function');
			expect(typeof ctx.context.sendPhoneOTP).toBe('function');
		});

		it('sendPhoneOTP delegates to smsService.sendTwoFactorOtpSms', async () => {
			getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
			const { hook, smsService } = makeHook();
			const ctx = makeCtx({ method: 'sms', phoneNumber: '04141234567' });

			await hook.before(ctx as never);

			await (
				ctx.context.sendPhoneOTP as (
					phone: string,
					otp: string,
				) => Promise<void>
			)('04141234567', '999999');
			expect(smsService.sendTwoFactorOtpSms).toHaveBeenCalledWith(
				'04141234567',
				'999999',
			);
		});
	});

	describe('invalid method', () => {
		it('throws APIError 400 for unknown method values', async () => {
			getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
			const { hook } = makeHook();
			const ctx = makeCtx({ method: 'carrier-pigeon' });

			let err: APIError | undefined;
			try {
				await hook.before(ctx as never);
			} catch (e) {
				err = e as APIError;
			}
			expect(err).toBeInstanceOf(APIError);
			expect(err?.status).toBe(400);
		});
	});

	function makeChallengeAfterCtx(userId = 'user-1', method = 'email') {
		const ctx = makeAfterCtx() as ReturnType<typeof makeAfterCtx> &
			Record<string, unknown>;
		getSessionMock.mockResolvedValue(null);
		ctx.context.createAuthCookie = vi.fn((name: string) => ({
			name: `test_${name}`,
		}));
		ctx.getSignedCookie = vi.fn().mockResolvedValue('signed-token');
		ctx.context.internalAdapter = {
			findVerificationValue: vi.fn().mockResolvedValue({ value: userId }),
		};
		ctx.context.secret = 'test-secret';
		ctx.context.otpMethod = method;
		return ctx as never;
	}

	describe('delivery failure handling', () => {
		it('sendEmailOTP throws APIError 500 when email delivery fails', async () => {
			getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
			const emailService = {
				sendTwoFactorOtpEmail: vi
					.fn()
					.mockRejectedValue(new Error('SMTP error')),
			};
			const { hook } = makeHook(emailService);
			const ctx = makeCtx({ method: 'email' });

			await hook.before(ctx as never);

			const thrown = await (
				ctx.context.sendEmailOTP as (
					email: string,
					otp: string,
				) => Promise<void>
			)('user@example.com', '123456').catch((e: unknown) => e);

			expect(thrown).toBeInstanceOf(APIError);
			expect((thrown as APIError).status).toBe(500);
		});

		it('sendPhoneOTP throws APIError 500 when SMS delivery fails', async () => {
			getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
			const smsService = {
				sendTwoFactorOtpSms: vi
					.fn()
					.mockRejectedValue(new Error('SMS gateway error')),
			};
			const { hook } = makeHook(makeEmailService(), smsService);
			const ctx = makeCtx({ method: 'sms', phoneNumber: '04141234567' });

			await hook.before(ctx as never);

			const thrown = await (
				ctx.context.sendPhoneOTP as (
					phone: string,
					otp: string,
				) => Promise<void>
			)('04141234567', '999999').catch((e: unknown) => e);

			expect(thrown).toBeInstanceOf(APIError);
			expect((thrown as APIError).status).toBe(500);
		});
	});

	describe('afterSendOtp (Task 3b: Log OTP sends)', () => {
		it('logs 2fa_enrollment_otp_sent audit when user has active session (enrollment flow)', async () => {
			const { hook, twoFactorAuditLog } = makeHook();
			const ctx: ReturnType<typeof makeAfterCtx> = makeAfterCtx();

			getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
			ctx.context.otpMethod = 'email';

			await hook.afterSendOtp(ctx);

			expect(twoFactorAuditLog.insertEvent).toHaveBeenCalledOnce();
			const auditParams = (
				twoFactorAuditLog.insertEvent as ReturnType<typeof vi.fn>
			).mock.calls[0][0] as Record<string, unknown>;
			expect(auditParams.eventType).toBe('2fa_enrollment_otp_sent');
			expect(auditParams.userId).toBe('user-1');
			expect(auditParams.method).toBe('email');
		});

		it('logs OTP sent event when in challenge flow (no session, 2FA cookie)', async () => {
			const { hook, twoFactorAuditLog } = makeHook();
			const ctx = makeChallengeAfterCtx('user-1', 'email');

			await hook.afterSendOtp(ctx);

			expect(twoFactorAuditLog.insertEvent).toHaveBeenCalledOnce();
			const auditParams = (
				twoFactorAuditLog.insertEvent as ReturnType<typeof vi.fn>
			).mock.calls[0][0] as Record<string, unknown>;
			expect(auditParams.eventType).toBe('2fa_challenge_otp_sent');
			expect(auditParams.userId).toBe('user-1');
			expect(auditParams.method).toBe('email');
		});

		it('logs OTP sent event with SMS method', async () => {
			const { hook, twoFactorAuditLog } = makeHook();
			const ctx = makeChallengeAfterCtx('user-1', 'sms');

			await hook.afterSendOtp(ctx);

			const auditParams = (
				twoFactorAuditLog.insertEvent as ReturnType<typeof vi.fn>
			).mock.calls[0][0] as Record<string, unknown>;
			expect(auditParams.method).toBe('sms');
		});

		it('extracts user from 2FA cookie when no session exists', async () => {
			const { hook, twoFactorAuditLog } = makeHook();
			const ctx = makeAfterCtx() as never;

			getSessionMock.mockResolvedValue(null);
			const createAuthCookieMock = vi.fn((name: string) => ({
				name: `test_${name}`,
			}));
			const getSignedCookieMock = vi.fn().mockResolvedValue('signed-token');
			const findVerificationValueMock = vi.fn().mockResolvedValue({
				value: 'user-from-cookie',
			});

			ctx.context.otpMethod = 'email';
			ctx.context.createAuthCookie = createAuthCookieMock;
			ctx.getSignedCookie = getSignedCookieMock;
			ctx.context.internalAdapter = {
				findVerificationValue: findVerificationValueMock,
			};
			ctx.context.secret = 'test-secret';

			await hook.afterSendOtp(ctx);

			const auditParams = (
				twoFactorAuditLog.insertEvent as ReturnType<typeof vi.fn>
			).mock.calls[0][0] as Record<string, unknown>;
			expect(auditParams.userId).toBe('user-from-cookie');
		});

		it('emits OTP sent metric during challenge flow', async () => {
			const { hook } = makeHook();
			const ctx = makeChallengeAfterCtx();

			await hook.afterSendOtp(ctx);

			expect(recordAuthEvent).toHaveBeenCalledWith('2fa_challenge_otp_sent');
		});

		it('returns early if no request', async () => {
			const { hook, twoFactorAuditLog } = makeHook();
			const ctx = makeAfterCtx() as never;

			ctx.request = undefined;

			await hook.afterSendOtp(ctx);

			expect(twoFactorAuditLog.insertEvent).not.toHaveBeenCalled();
		});

		it('returns early if userId cannot be determined', async () => {
			const { hook, twoFactorAuditLog } = makeHook();
			const ctx = makeAfterCtx() as never;

			getSessionMock.mockResolvedValue(null);
			ctx.context.createAuthCookie = vi.fn((name: string) => ({
				name: `test_${name}`,
			}));
			ctx.getSignedCookie = vi.fn().mockResolvedValue(null);
			ctx.context.otpMethod = 'email';

			await hook.afterSendOtp(ctx);

			expect(twoFactorAuditLog.insertEvent).not.toHaveBeenCalled();
		});

		it('includes IP hash in audit log', async () => {
			const { hook, twoFactorAuditLog } = makeHook();
			const ctx = makeChallengeAfterCtx();

			await hook.afterSendOtp(ctx);

			const auditParams = (
				twoFactorAuditLog.insertEvent as ReturnType<typeof vi.fn>
			).mock.calls[0][0] as Record<string, unknown>;
			expect(auditParams.ipHash).toBeTypeOf('string');
		});

		it('includes correlation ID from headers', async () => {
			const { hook, twoFactorAuditLog } = makeHook();
			const ctx = makeChallengeAfterCtx();

			await hook.afterSendOtp(ctx);

			const auditParams = (
				twoFactorAuditLog.insertEvent as ReturnType<typeof vi.fn>
			).mock.calls[0][0] as Record<string, unknown>;
			expect(auditParams.correlationId).toBe('corr-1');
		});

		it('defaults otpMethod to "email" if not set', async () => {
			const { hook, twoFactorAuditLog } = makeHook();
			const ctx = makeChallengeAfterCtx('user-1', 'email');
			// clear otpMethod to test default
			(ctx as Record<string, unknown>).context = {
				...(ctx as Record<string, unknown>).context,
				otpMethod: undefined,
			};

			await hook.afterSendOtp(ctx);

			const auditParams = (
				twoFactorAuditLog.insertEvent as ReturnType<typeof vi.fn>
			).mock.calls[0][0] as Record<string, unknown>;
			expect(auditParams.method).toBe('email');
		});
	});

	describe('afterSendOtp — setup flow pending method', () => {
		it('calls pendingMethod.set with userId, method, and OTP_TTL_SECONDS in setup flow', async () => {
			const pendingMethod = makePendingMethod();
			const { hook } = makeHook(
				makeEmailService(),
				makeSmsService(),
				makeTwoFactorAuditLog(),
				pendingMethod,
			);
			const ctx = makeAfterCtx();
			ctx.context.otpMethod = 'email';
			getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });

			await hook.afterSendOtp(ctx);

			expect(pendingMethod.set).toHaveBeenCalledOnce();
			expect(pendingMethod.set).toHaveBeenCalledWith(
				'user-1',
				{ method: 'email' },
				300,
			);
		});

		it('stores phoneNumber in pending method payload for SMS enrollment', async () => {
			const pendingMethod = makePendingMethod();
			const { hook } = makeHook(
				makeEmailService(),
				makeSmsService(),
				makeTwoFactorAuditLog(),
				pendingMethod,
			);
			const ctx = makeAfterCtx();
			ctx.context.otpMethod = 'sms';
			ctx.context.enrollmentPhoneNumber = '04121234567';
			getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });

			await hook.afterSendOtp(ctx);

			expect(pendingMethod.set).toHaveBeenCalledWith(
				'user-1',
				{ method: 'sms', phoneNumber: '04121234567' },
				300,
			);
		});

		it('does NOT call pendingMethod.set during challenge flow (no active session)', async () => {
			const pendingMethod = makePendingMethod();
			const { hook } = makeHook(
				makeEmailService(),
				makeSmsService(),
				makeTwoFactorAuditLog(),
				pendingMethod,
			);
			const ctx = makeChallengeAfterCtx('user-1', 'email');

			await hook.afterSendOtp(ctx);

			expect(pendingMethod.set).not.toHaveBeenCalled();
		});
	});

	describe('before — challenge path enforcement (A2.5)', () => {
		function makeChallengeBeforeCtx(body: Record<string, unknown> = {}) {
			const ctx = makeCtx(body);
			// No active session = challenge path
			ctx.context.createAuthCookie = vi.fn((name: string) => ({
				name: `test_${name}`,
			}));
			ctx.context.internalAdapter = {
				findVerificationValue: vi.fn().mockResolvedValue({ value: 'user-1' }),
			};
			ctx.context.secret = 'test-secret';
			ctx.getSignedCookie = vi.fn().mockResolvedValue('signed-token');
			// Simulate challenge: no session
			ctx.request = new Request('http://localhost/two-factor/send-otp');
			return ctx;
		}

		it('ignores body.method in challenge path and uses stored method', async () => {
			const { hook } = makeHook(
				makeEmailService(),
				makeSmsService(),
				makeTwoFactorAuditLog(),
				makePendingMethod(),
				makeTwoFactorRepo('sms'),
			);
			getSessionMock.mockResolvedValue(null);
			const ctx = makeChallengeBeforeCtx({ method: 'email' });

			await hook.before(ctx as never);

			// Should use stored 'sms' from user_two_factor, not body 'email'
			expect(ctx.context.otpMethod).toBe('sms');
		});

		it('throws 400 when stored method is totp in challenge path', async () => {
			const { hook } = makeHook(
				makeEmailService(),
				makeSmsService(),
				makeTwoFactorAuditLog(),
				makePendingMethod(),
				makeTwoFactorRepo('totp'),
			);
			getSessionMock.mockResolvedValue(null);
			const ctx = makeChallengeBeforeCtx({});

			await expect(hook.before(ctx as never)).rejects.toThrow(APIError);
		});

		it('uses stored email method in challenge path when no body method', async () => {
			const { hook } = makeHook(
				makeEmailService(),
				makeSmsService(),
				makeTwoFactorAuditLog(),
				makePendingMethod(),
				makeTwoFactorRepo('email'),
			);
			getSessionMock.mockResolvedValue(null);
			const ctx = makeChallengeBeforeCtx({});

			await hook.before(ctx as never);

			expect(ctx.context.otpMethod).toBe('email');
		});
	});

	describe('before — enrollment SMS phone extraction', () => {
		it('sets enrollmentPhoneNumber in context when method=sms and phoneNumber is provided', async () => {
			getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
			const { hook } = makeHook();
			const ctx = makeCtx({ method: 'sms', phoneNumber: '04121234567' });

			await hook.before(ctx as never);

			expect(ctx.context.enrollmentPhoneNumber).toBe('04121234567');
		});

		it('throws 400 when method=sms but phoneNumber is missing', async () => {
			getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
			const { hook } = makeHook();
			const ctx = makeCtx({ method: 'sms' });

			await expect(hook.before(ctx as never)).rejects.toThrow(APIError);
			try {
				await hook.before(ctx as never);
			} catch (err) {
				expect((err as APIError).statusCode).toBe(400);
			}
		});

		it('throws 400 when method=sms but phoneNumber is empty string', async () => {
			getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
			const { hook } = makeHook();
			const ctx = makeCtx({ method: 'sms', phoneNumber: '' });

			await expect(hook.before(ctx as never)).rejects.toThrow(APIError);
		});

		it('throws 400 when method=sms but phoneNumber has invalid format', async () => {
			getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
			const { hook } = makeHook();
			const ctx = makeCtx({ method: 'sms', phoneNumber: '1234' });

			await expect(hook.before(ctx as never)).rejects.toThrow(APIError);
		});

		it('does NOT set enrollmentPhoneNumber when method=email', async () => {
			getSessionMock.mockResolvedValue({ user: { id: 'user-1' } });
			const { hook } = makeHook();
			const ctx = makeCtx({ method: 'email' });

			await hook.before(ctx as never);

			expect(ctx.context.enrollmentPhoneNumber).toBeUndefined();
		});
	});
});
