import { APIError } from 'better-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module-level mock declarations — must be at top level for vi.mock hoisting
// ---------------------------------------------------------------------------

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

vi.mock('jose', () => ({
	jwtVerify: vi.fn(),
}));

vi.mock('../../../src/env', () => ({
	env: { BETTER_AUTH_SECRET: 'test-secret' },
}));

// ---------------------------------------------------------------------------
// Imports (after mocks so they resolve the mocked versions)
// ---------------------------------------------------------------------------

import { jwtVerify } from 'jose';
import type { AccountRepositoryPort } from '../../../src/application/ports/out/account-repository.port';
import type { AuditLogServicePort } from '../../../src/application/ports/out/audit-log-service.port';
import type { ChangeEmailAuditLogPort } from '../../../src/application/ports/out/change-email-audit-log.port';
import type { ChangeEmailPendingPort } from '../../../src/application/ports/out/change-email-pending.port';
import type { UserRepositoryPort } from '../../../src/application/ports/out/user-repository.port';
import {
	EmailVerificationHook,
	handleEmailVerificationFailure,
	handleEmailVerificationSuccess,
	handleResendFailure,
	handleResendOutcome,
} from '../../../src/infrastructure/hooks/email-verification.hooks';
import { auditLogger } from '../../../src/shared/logger/audit-logger';
import { recordAuthEvent } from '../../../src/shared/metrics/auth-metrics';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeMockAuditLog(): {
	logSignupEvent: ReturnType<typeof vi.fn>;
	logLoginAttempt: ReturnType<typeof vi.fn>;
} & Pick<AuditLogServicePort, 'logSignupEvent'> {
	return {
		logSignupEvent: vi.fn().mockResolvedValue(undefined),
		logLoginAttempt: vi.fn(),
	} as unknown as {
		logSignupEvent: ReturnType<typeof vi.fn>;
		logLoginAttempt: ReturnType<typeof vi.fn>;
	} & Pick<AuditLogServicePort, 'logSignupEvent'>;
}

const BASE = {
	ipHash: 'sha256hash',
	userAgent: 'Mozilla/5.0',
	correlationId: 'corr-123',
};

// ---------------------------------------------------------------------------
// Tests — handleEmailVerificationOutcome
// ---------------------------------------------------------------------------

describe('handleEmailVerificationSuccess', () => {
	beforeEach(() => vi.clearAllMocks());

	it('calls auditLogger.info with event email_verification_success', async () => {
		const auditLogService = makeMockAuditLog();
		await handleEmailVerificationSuccess(
			{ userId: 'user-abc', ...BASE },
			auditLogService,
		);

		expect(auditLogger.info).toHaveBeenCalledOnce();
		const log = (auditLogger.info as ReturnType<typeof vi.fn>).mock.calls[0][0];
		expect(log.event).toBe('email_verification_success');
		expect(log.userId).toBe('user-abc');
	});

	it('calls logSignupEvent with eventType email_verification_success', async () => {
		const auditLogService = makeMockAuditLog();
		await handleEmailVerificationSuccess(
			{ userId: 'user-abc', ...BASE },
			auditLogService,
		);

		expect(auditLogService.logSignupEvent).toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'email_verification_success' }),
		);
	});

	it('records email_verification_succeeded metric', async () => {
		const auditLogService = makeMockAuditLog();
		await handleEmailVerificationSuccess(
			{ userId: 'user-abc', ...BASE },
			auditLogService,
		);

		expect(recordAuthEvent).toHaveBeenCalledWith(
			'email_verification_succeeded',
		);
	});
});

describe('handleEmailVerificationFailure', () => {
	beforeEach(() => vi.clearAllMocks());

	it('logs expired failure and calls logSignupEvent with email_verification_failure_expired', async () => {
		const auditLogService = makeMockAuditLog();
		await handleEmailVerificationFailure(
			{ failureEventType: 'email_verification_failure_expired', ...BASE },
			auditLogService,
		);

		expect(auditLogService.logSignupEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'email_verification_failure_expired',
			}),
		);
	});

	it('records email_verification_failed metric with error_type for expired token', async () => {
		const auditLogService = makeMockAuditLog();
		await handleEmailVerificationFailure(
			{ failureEventType: 'email_verification_failure_expired', ...BASE },
			auditLogService,
		);

		expect(recordAuthEvent).toHaveBeenCalledWith('email_verification_failed', {
			error_type: 'email_verification_failure_expired',
		});
	});

	it('calls logSignupEvent with email_verification_failure_used for used token', async () => {
		const auditLogService = makeMockAuditLog();
		await handleEmailVerificationFailure(
			{ failureEventType: 'email_verification_failure_used', ...BASE },
			auditLogService,
		);

		expect(auditLogService.logSignupEvent).toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'email_verification_failure_used' }),
		);
	});

	it('calls logSignupEvent with email_verification_failure_invalid for unknown error', async () => {
		const auditLogService = makeMockAuditLog();
		await handleEmailVerificationFailure(
			{ failureEventType: 'email_verification_failure_invalid', ...BASE },
			auditLogService,
		);

		expect(auditLogService.logSignupEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'email_verification_failure_invalid',
			}),
		);
	});
});

// ---------------------------------------------------------------------------
// Tests — handleResendOutcome
// ---------------------------------------------------------------------------

describe('handleResendOutcome', () => {
	beforeEach(() => vi.clearAllMocks());

	it('calls logSignupEvent with email_verification_resend and records verification_resend_succeeded', async () => {
		const auditLogService = makeMockAuditLog();
		await handleResendOutcome({ ...BASE }, auditLogService);

		expect(auditLogService.logSignupEvent).toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'email_verification_resend' }),
		);
		expect(recordAuthEvent).toHaveBeenCalledWith(
			'verification_resend_succeeded',
		);
	});
});

// ---------------------------------------------------------------------------
// Tests — handleResendFailure
// ---------------------------------------------------------------------------

describe('handleResendFailure', () => {
	beforeEach(() => vi.clearAllMocks());

	it('logs auditLogger.error and records verification_resend_failed', () => {
		handleResendFailure({ ...BASE });

		expect(auditLogger.error).toHaveBeenCalledOnce();
		const log = (auditLogger.error as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		expect(log.event).toBe('verification_resend_failed');
		expect(recordAuthEvent).toHaveBeenCalledWith('verification_resend_failed');
	});
});

// ---------------------------------------------------------------------------
// Class-level tests — EmailVerificationHook Phase 6 extensions
// ---------------------------------------------------------------------------

const USER_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const OLD_EMAIL = 'old@example.com';
const NEW_EMAIL = 'new@example.com';

// biome-ignore lint/suspicious/noExplicitAny: structural mock
function makeBeforeCtx({
	token,
	hasRequest = true,
}: {
	token?: string;
	hasRequest?: boolean;
} = {}): any {
	const qs = token ? `?token=${encodeURIComponent(token)}` : '';
	return {
		request: hasRequest
			? ({
					url: `http://auth.internal/verify-email${qs}`,
				} as unknown as Request)
			: undefined,
		path: '/verify-email',
		body: {},
		context: {} as Record<string, unknown>,
		getHeader: vi.fn().mockReturnValue(null),
	};
}

// biome-ignore lint/suspicious/noExplicitAny: structural mock
function makeAfterCtx({
	verifyCtx,
	returned,
}: {
	verifyCtx?: unknown;
	returned?: unknown;
} = {}): any {
	return {
		request: { url: 'http://auth.internal/verify-email' } as unknown as Request,
		path: '/verify-email',
		body: {},
		context: {
			...(verifyCtx !== undefined ? { emailVerifyCtx: verifyCtx } : {}),
			returned,
			responseHeaders: { set: vi.fn() },
		} as Record<string, unknown>,
		getHeader: vi.fn().mockReturnValue(null),
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

describe("EmailVerificationHook — @BeforeHook('/verify-email')", () => {
	let auditLogService: Pick<AuditLogServicePort, 'logSignupEvent'>;
	let accountRepo: AccountRepositoryPort;
	let userRepo: UserRepositoryPort;
	let changeEmailPendingPort: ChangeEmailPendingPort;
	let changeEmailAuditLog: ChangeEmailAuditLogPort;

	beforeEach(() => {
		vi.clearAllMocks();

		auditLogService = {
			logSignupEvent: vi.fn().mockResolvedValue(undefined),
		} as unknown as Pick<AuditLogServicePort, 'logSignupEvent'>;
		accountRepo = {
			findCredentialAccount: vi.fn(),
			updatePassword: vi.fn(),
			unlinkSocialAccountsExcept: vi.fn().mockResolvedValue(undefined),
			createCredential: vi.fn(),
			deleteCredential: vi.fn(),
		};
		userRepo = {
			findById: vi.fn(),
			findByEmail: vi.fn().mockResolvedValue({ id: USER_ID }),
			findByNormalizedEmail: vi.fn(),
			save: vi.fn(),
			updateSessionInvalidBefore: vi.fn(),
			updateTwoFactorEnabled: vi.fn(),
			createProvisioned: vi.fn(),
			markEmailVerified: vi.fn(),
		};
		changeEmailPendingPort = {
			set: vi.fn(),
			get: vi.fn().mockResolvedValue({
				newEmail: NEW_EMAIL,
				normalizedNewEmail: NEW_EMAIL,
				oldEmail: OLD_EMAIL,
				createdAt: new Date().toISOString(),
			}),
			delete: vi.fn().mockResolvedValue(undefined),
		};
		changeEmailAuditLog = { log: vi.fn().mockResolvedValue(undefined) };

		// Default: jwtVerify returns a change-email-verification payload
		(jwtVerify as ReturnType<typeof vi.fn>).mockResolvedValue({
			payload: {
				email: OLD_EMAIL,
				updateTo: NEW_EMAIL,
				requestType: 'change-email-verification',
			},
		});
	});

	function makeHook(): EmailVerificationHook {
		return new EmailVerificationHook(
			auditLogService as AuditLogServicePort,
			accountRepo,
			userRepo,
			changeEmailPendingPort,
			changeEmailAuditLog,
		);
	}

	it('returns early when no request', async () => {
		const ctx = makeBeforeCtx({ hasRequest: false });
		await expect(makeHook().handleVerifyBefore(ctx)).resolves.toBeUndefined();
		expect(jwtVerify).not.toHaveBeenCalled();
	});

	it('returns early when no token in URL query; JWT decode not called', async () => {
		const ctx = makeBeforeCtx(); // no token
		await expect(makeHook().handleVerifyBefore(ctx)).resolves.toBeUndefined();
		expect(jwtVerify).not.toHaveBeenCalled();
	});

	it('returns early on JWT signature failure', async () => {
		(jwtVerify as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error('JWSSignatureVerificationFailed'),
		);
		const ctx = makeBeforeCtx({ token: 'bad-token' });
		await expect(makeHook().handleVerifyBefore(ctx)).resolves.toBeUndefined();
		expect(changeEmailPendingPort.get).not.toHaveBeenCalled();
	});

	it('returns early on JWT expired', async () => {
		(jwtVerify as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error('JWTExpired'),
		);
		const ctx = makeBeforeCtx({ token: 'expired-token' });
		await expect(makeHook().handleVerifyBefore(ctx)).resolves.toBeUndefined();
		expect(changeEmailPendingPort.get).not.toHaveBeenCalled();
	});

	it('stashes sign-up emailVerifyCtx when no requestType; pendingPort.get not called', async () => {
		(jwtVerify as ReturnType<typeof vi.fn>).mockResolvedValue({
			payload: { email: OLD_EMAIL }, // no requestType
		});
		const ctx = makeBeforeCtx({ token: 'signup-token' });
		await makeHook().handleVerifyBefore(ctx);
		expect(ctx.context.emailVerifyCtx).toEqual({ type: 'sign-up' });
		expect(changeEmailPendingPort.get).not.toHaveBeenCalled();
	});

	it('change-email JWT + matching pending record → stashes change-email ctx; pendingPort.get called once', async () => {
		const ctx = makeBeforeCtx({ token: 'valid-token' });
		await makeHook().handleVerifyBefore(ctx);
		expect(changeEmailPendingPort.get).toHaveBeenCalledOnce();
		expect(ctx.context.emailVerifyCtx).toMatchObject({
			type: 'change-email',
			userId: USER_ID,
			oldEmail: OLD_EMAIL,
			newEmail: NEW_EMAIL,
		});
	});

	it('change-email JWT + missing pending record → throws 400 token_invalidated', async () => {
		(changeEmailPendingPort.get as ReturnType<typeof vi.fn>).mockResolvedValue(
			null,
		);
		const err = await catchError(() =>
			makeHook().handleVerifyBefore(makeBeforeCtx({ token: 'valid-token' })),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(400);
		expect((err as APIError).body).toMatchObject({
			error: 'token_invalidated',
		});
	});

	it('change-email JWT + pending newEmail mismatch → throws 400 token_invalidated', async () => {
		(changeEmailPendingPort.get as ReturnType<typeof vi.fn>).mockResolvedValue({
			newEmail: 'different@example.com',
			normalizedNewEmail: 'different@example.com',
			oldEmail: OLD_EMAIL,
			createdAt: new Date().toISOString(),
		});
		const err = await catchError(() =>
			makeHook().handleVerifyBefore(makeBeforeCtx({ token: 'valid-token' })),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(400);
		expect((err as APIError).body).toMatchObject({
			error: 'token_invalidated',
		});
	});

	it('user not found from JWT email → throws 400 token_invalidated; pendingPort.get not called; warn audit emitted', async () => {
		(userRepo.findByEmail as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		const ctx = makeBeforeCtx({ token: 'valid-token' });

		const err = await catchError(() => makeHook().handleVerifyBefore(ctx));

		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(400);
		expect((err as APIError).body).toMatchObject({
			error: 'token_invalidated',
		});
		expect(changeEmailPendingPort.get).not.toHaveBeenCalled();
		expect(ctx.context.emailVerifyCtx).toBeUndefined();
		expect(auditLogger.warn).toHaveBeenCalledWith(
			expect.objectContaining({
				event: 'change_email_jwt_email_not_resolved',
			}),
			expect.any(String),
		);
	});
});

describe("EmailVerificationHook — @AfterHook('/verify-email') change-email extension", () => {
	let auditLogService: Pick<AuditLogServicePort, 'logSignupEvent'>;
	let accountRepo: AccountRepositoryPort;
	let userRepo: UserRepositoryPort;
	let changeEmailPendingPort: ChangeEmailPendingPort;
	let changeEmailAuditLog: ChangeEmailAuditLogPort;

	const changeEmailVerifyCtx = {
		type: 'change-email' as const,
		userId: USER_ID,
		oldEmail: OLD_EMAIL,
		newEmail: NEW_EMAIL,
	};

	beforeEach(() => {
		vi.clearAllMocks();

		auditLogService = {
			logSignupEvent: vi.fn().mockResolvedValue(undefined),
		} as unknown as Pick<AuditLogServicePort, 'logSignupEvent'>;
		accountRepo = {
			findCredentialAccount: vi.fn(),
			updatePassword: vi.fn(),
			unlinkSocialAccountsExcept: vi.fn().mockResolvedValue(undefined),
			createCredential: vi.fn(),
			deleteCredential: vi.fn(),
		};
		userRepo = {
			findById: vi.fn(),
			findByEmail: vi.fn(),
			findByNormalizedEmail: vi.fn(),
			save: vi.fn(),
			updateSessionInvalidBefore: vi.fn(),
			updateTwoFactorEnabled: vi.fn(),
			createProvisioned: vi.fn(),
			markEmailVerified: vi.fn(),
		};
		changeEmailPendingPort = {
			set: vi.fn(),
			get: vi.fn(),
			delete: vi.fn().mockResolvedValue(undefined),
		};
		changeEmailAuditLog = { log: vi.fn().mockResolvedValue(undefined) };
	});

	function makeHook(): EmailVerificationHook {
		return new EmailVerificationHook(
			auditLogService as AuditLogServicePort,
			accountRepo,
			userRepo,
			changeEmailPendingPort,
			changeEmailAuditLog,
		);
	}

	it('no emailVerifyCtx → sign-up path runs (email_verification_success emitted)', async () => {
		const ctx = makeAfterCtx({ returned: { user: { id: USER_ID } } }); // no emailVerifyCtx
		await makeHook().handleVerify(ctx);
		expect(recordAuthEvent).toHaveBeenCalledWith(
			'email_verification_succeeded',
		);
		expect(accountRepo.unlinkSocialAccountsExcept).not.toHaveBeenCalled();
	});

	it('sign-up emailVerifyCtx → sign-up path runs unchanged (regression guard)', async () => {
		const ctx = makeAfterCtx({
			verifyCtx: { type: 'sign-up' },
			returned: { user: { id: USER_ID } },
		});
		await makeHook().handleVerify(ctx);
		expect(recordAuthEvent).toHaveBeenCalledWith(
			'email_verification_succeeded',
		);
		expect(accountRepo.unlinkSocialAccountsExcept).not.toHaveBeenCalled();
	});

	it('change-email success → unlinkSocialAccountsExcept called, headers set, pendingPort.delete called, email_change_completed emitted', async () => {
		const ctx = makeAfterCtx({
			verifyCtx: changeEmailVerifyCtx,
			returned: { user: { id: USER_ID } }, // success — no statusCode ≥ 400
		});

		await makeHook().handleVerify(ctx);

		expect(accountRepo.unlinkSocialAccountsExcept).toHaveBeenCalledWith(
			USER_ID,
			NEW_EMAIL,
		);
		expect(ctx.context.responseHeaders.set).toHaveBeenCalledWith(
			'X-Email-Changed',
			USER_ID,
		);
		expect(ctx.context.responseHeaders.set).toHaveBeenCalledWith(
			'X-Email-Changed-New',
			expect.any(String),
		);
		expect(changeEmailPendingPort.delete).toHaveBeenCalledWith(USER_ID);
		expect(recordAuthEvent).toHaveBeenCalledWith('email_change_completed');
		// Must NOT emit the standard sign-up success event
		expect(recordAuthEvent).not.toHaveBeenCalledWith(
			'email_verification_succeeded',
		);
	});

	it('change-email BA error → email_change_failed emitted; pendingPort.delete NOT called', async () => {
		const ctx = makeAfterCtx({
			verifyCtx: changeEmailVerifyCtx,
			returned: { statusCode: 400, body: { code: 'TOKEN_EXPIRED' } },
		});

		await makeHook().handleVerify(ctx);

		expect(recordAuthEvent).toHaveBeenCalledWith('email_change_failed');
		expect(changeEmailPendingPort.delete).not.toHaveBeenCalled();
		expect(accountRepo.unlinkSocialAccountsExcept).not.toHaveBeenCalled();
	});

	it('pendingPort.delete throws → error logged; method does NOT throw', async () => {
		(
			changeEmailPendingPort.delete as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error('redis down'));
		const ctx = makeAfterCtx({
			verifyCtx: changeEmailVerifyCtx,
			returned: { user: { id: USER_ID } },
		});

		await expect(makeHook().handleVerify(ctx)).resolves.toBeUndefined();
		expect(auditLogger.error).toHaveBeenCalled();
		expect(recordAuthEvent).toHaveBeenCalledWith('email_change_completed');
	});
});
