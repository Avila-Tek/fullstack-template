/**
 * Tests for SignInHook:
 *   - @BeforeHook: resolves system key, verifies captcha, blocks brute-force attempts
 *   - @AfterHook: mints ES256 JWT, enforces access model, writes audit events,
 *                 clears brute-force counter on success, sets device cookie,
 *                 writes structured logs via logSuccess / logFailure
 */

// ---------------------------------------------------------------------------
// Module-level mocks — must be at the top for vi.mock hoisting
// ---------------------------------------------------------------------------

const mockEnv = vi.hoisted(() => ({
	SKIP_CAPTCHA: false as boolean,
	BRUTE_FORCE_MAX_ATTEMPTS: 5,
}));

vi.mock('../../../src/env', () => ({ env: mockEnv }));

vi.mock('../../../src/shared/logger/audit-logger', () => ({
	auditLogger: { info: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../../src/shared/metrics/auth-metrics', () => ({
	recordAuthEvent: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { APIError } from 'better-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { AuditLogServicePort } from '../../../src/application/ports/out/audit-log-service.port';
import type { BruteForceServicePort } from '../../../src/application/ports/out/brute-force-service.port';
import type { CaptchaServicePort } from '../../../src/application/ports/out/captcha-service.port';
import type { EmailServicePort } from '../../../src/application/ports/out/email-service.port';
import type { JwkRepositoryPort } from '../../../src/application/ports/out/jwk-repository.port';
import type { JwtMintServicePort } from '../../../src/application/ports/out/jwt-mint-service.port';
import type { SystemAuditLogPort } from '../../../src/application/ports/out/system-audit-log.port';
import type { SystemKeyPort } from '../../../src/application/ports/out/system-key-service.port';
import type { SystemMembershipRepositoryPort } from '../../../src/application/ports/out/system-membership-repository.port';
import type { TwoFactorRepositoryPort } from '../../../src/application/ports/out/two-factor-repository.port';
import type { UserRepositoryPort } from '../../../src/application/ports/out/user-repository.port';
import type { JwkEntity } from '../../../src/domain/entities/jwk.entity';
import type { SystemMembershipEntity } from '../../../src/domain/entities/system-membership.entity';
import { AccessDeniedException } from '../../../src/domain/exceptions/access-denied.exception';
import { SignInHook } from '../../../src/infrastructure/hooks/sign-in.hooks';
import { auditLogger } from '../../../src/shared/logger/audit-logger';
import { recordAuthEvent } from '../../../src/shared/metrics/auth-metrics';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ACTIVE_RESOLUTION = {
	systemId: 'sys-001',
	organizationId: 'org-001',
	accessModel: 'open' as const,
	apiBaseUrl: 'https://api.example.com',
	status: 'active' as const,
};

const RESTRICTED_RESOLUTION = {
	...ACTIVE_RESOLUTION,
	accessModel: 'restricted' as const,
};

const SUSPENDED_RESOLUTION = {
	...ACTIVE_RESOLUTION,
	status: 'suspended' as const,
};

const ACTIVE_MEMBERSHIP: SystemMembershipEntity = {
	id: 'mem-001',
	systemId: 'sys-001',
	organizationId: 'org-001',
	userId: 'user-abc',
	role: 'admin',
	status: 'active',
	isDeleted: false,
};

const MOCK_JWK: JwkEntity = {
	id: 'jwk-001',
	kid: 'kid-001',
	publicJwk: '{}',
	privateJwk: '{}',
	algorithm: 'ES256',
};

const SUCCESS_RETURNED = {
	user: { id: 'user-abc', email: 'test@example.com', emailVerified: true },
	session: { id: 'sess-xyz' },
};

const FAILURE_RETURNED = {
	statusCode: 401,
	body: { code: 'INVALID_EMAIL_OR_PASSWORD' },
};

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeSystemKeyPort(
	resolution = ACTIVE_RESOLUTION as typeof ACTIVE_RESOLUTION | null,
): SystemKeyPort {
	return { resolveSystemId: vi.fn().mockResolvedValue(resolution) };
}

function makeMembershipRepo(
	existing: SystemMembershipEntity | null = null,
): SystemMembershipRepositoryPort {
	return {
		findByUserAndOrg: vi.fn().mockResolvedValue(existing),
		upsertMember: vi.fn().mockResolvedValue(undefined),
	};
}

function makeJwkRepo(jwk: JwkEntity | null = MOCK_JWK): JwkRepositoryPort {
	return { getActiveKey: vi.fn().mockResolvedValue(jwk) };
}

function makeJwtMintService(token = 'minted-jwt'): JwtMintServicePort {
	return { mint: vi.fn().mockResolvedValue(token) };
}

function makeSystemAuditLog(): SystemAuditLogPort {
	return {
		log: vi.fn().mockResolvedValue(undefined),
	} as unknown as SystemAuditLogPort;
}

function makeCaptchaService(result = { success: true }): CaptchaServicePort {
	return {
		verify: vi.fn().mockResolvedValue(result),
	} as unknown as CaptchaServicePort;
}

function makeBruteForce(count = 0): BruteForceServicePort {
	return {
		increment: vi.fn().mockResolvedValue(count + 1),
		getCount: vi.fn().mockResolvedValue(count),
		clear: vi.fn().mockResolvedValue(undefined),
	} as unknown as BruteForceServicePort;
}

function makeAuditLogService(): AuditLogServicePort {
	return {
		logLoginAttempt: vi.fn().mockResolvedValue(undefined),
		logSignupEvent: vi.fn().mockResolvedValue(undefined),
		logSocialAuthEvent: vi.fn().mockResolvedValue(undefined),
	} as unknown as AuditLogServicePort;
}

function makeEmailService(): EmailServicePort {
	return {
		sendVerificationEmail: vi.fn().mockResolvedValue(undefined),
		sendWelcomeEmail: vi.fn().mockResolvedValue(undefined),
		sendPasswordResetEmail: vi.fn().mockResolvedValue(undefined),
		sendLoginAlertEmail: vi.fn().mockResolvedValue(undefined),
		sendEmailChangeVerificationEmail: vi.fn().mockResolvedValue(undefined),
		sendSessionRevokedEmail: vi.fn().mockResolvedValue(undefined),
		sendTwoFactorOtpEmail: vi.fn().mockResolvedValue(undefined),
		sendFailedLoginAlertEmail: vi.fn().mockResolvedValue(undefined),
	} as unknown as EmailServicePort;
}

function makeUserRepository(user = null): UserRepositoryPort {
	return {
		findById: vi.fn().mockResolvedValue(null),
		findByEmail: vi.fn().mockResolvedValue(null),
		findByNormalizedEmail: vi.fn().mockResolvedValue(user),
		save: vi.fn().mockResolvedValue(undefined),
		updateSessionInvalidBefore: vi.fn().mockResolvedValue(undefined),
		updateTwoFactorEnabled: vi.fn().mockResolvedValue(undefined),
		createProvisioned: vi.fn().mockResolvedValue(null),
	} as unknown as UserRepositoryPort;
}

function makeTwoFactorRepository(record = null): TwoFactorRepositoryPort {
	return {
		findEnabledByUserId: vi.fn().mockResolvedValue(record),
		forceEnableEmail: vi.fn().mockResolvedValue(undefined),
	} as unknown as TwoFactorRepositoryPort;
}

function makeCtx(
	overrides: {
		headers?: Record<string, string>;
		returned?: unknown;
		systemResolution?: unknown;
		hasRequest?: boolean;
		body?: Record<string, unknown>;
		bruteForceKey?: string;
		correlationId?: string;
		deviceId?: string;
	} = {},
	// biome-ignore lint/suspicious/noExplicitAny: structural mock for AuthHookContext
): any {
	const headers: Record<string, string> = overrides.headers ?? {
		'x-system-key': 'valid-key',
		'user-agent': 'test-agent',
		'x-forwarded-for': '1.2.3.4',
	};

	const context: Record<string, unknown> = {
		returned:
			overrides.returned !== undefined
				? overrides.returned
				: { ...SUCCESS_RETURNED },
		...(overrides.systemResolution !== undefined
			? { systemResolution: overrides.systemResolution }
			: { systemResolution: ACTIVE_RESOLUTION }),
		correlationId: overrides.correlationId ?? 'corr-123',
		// deviceId pre-populated as if DeviceHook already ran
		deviceId: overrides.deviceId,
	};

	if (overrides.bruteForceKey !== undefined) {
		context.bruteForceKey = overrides.bruteForceKey;
	}

	return {
		request:
			overrides.hasRequest === false
				? undefined
				: ({ method: 'POST' } as unknown as Request),
		path: '/sign-in/email',
		body: overrides.body ?? {},
		context,
		getHeader: (name: string) => headers[name.toLowerCase()] ?? null,
		getCookie: vi.fn(),
		setCookie: vi.fn(),
	};
}

function makeHook({
	systemKeyPort = makeSystemKeyPort(),
	membershipRepo = makeMembershipRepo(),
	jwkRepo = makeJwkRepo(),
	jwtMintService = makeJwtMintService(),
	systemAuditLog = makeSystemAuditLog(),
	captchaService = makeCaptchaService(),
	bruteForce = makeBruteForce(),
	auditLogService = makeAuditLogService(),
	emailService = makeEmailService(),
	userRepo = makeUserRepository(),
	twoFactorRepo = makeTwoFactorRepository(),
}: {
	systemKeyPort?: SystemKeyPort;
	membershipRepo?: SystemMembershipRepositoryPort;
	jwkRepo?: JwkRepositoryPort;
	jwtMintService?: JwtMintServicePort;
	systemAuditLog?: SystemAuditLogPort;
	captchaService?: CaptchaServicePort;
	bruteForce?: BruteForceServicePort;
	auditLogService?: AuditLogServicePort;
	emailService?: EmailServicePort;
	userRepo?: UserRepositoryPort;
	twoFactorRepo?: TwoFactorRepositoryPort;
} = {}): SignInHook {
	return new SignInHook(
		systemKeyPort,
		membershipRepo,
		jwkRepo,
		jwtMintService,
		systemAuditLog,
		captchaService,
		bruteForce,
		auditLogService,
		emailService,
		userRepo,
		twoFactorRepo,
	);
}

async function catchError(fn: () => Promise<unknown>): Promise<unknown> {
	try {
		await fn();
	} catch (e) {
		return e;
	}
	return undefined;
}

// ---------------------------------------------------------------------------
// Tests — handleBefore() — system key resolution
// ---------------------------------------------------------------------------

describe('SignInHook.handleBefore()', () => {
	beforeEach(() => vi.clearAllMocks());

	it('no-ops when ctx.request is absent', async () => {
		const port = makeSystemKeyPort();
		await makeHook({ systemKeyPort: port }).handleBefore(
			makeCtx({ hasRequest: false }),
		);
		expect(port.resolveSystemId).not.toHaveBeenCalled();
	});

	it('stores system resolution in ctx.context.systemResolution', async () => {
		const ctx = makeCtx({ systemResolution: undefined });
		await makeHook().handleBefore(ctx);
		expect(ctx.context.systemResolution).toMatchObject({
			systemId: 'sys-001',
			organizationId: 'org-001',
		});
	});

	it('injects systemAuditLog into ctx.context', async () => {
		const auditLog = makeSystemAuditLog();
		const ctx = makeCtx({ systemResolution: undefined });
		await makeHook({ systemAuditLog: auditLog }).handleBefore(ctx);
		expect(ctx.context.systemAuditLog).toBe(auditLog);
	});

	it('throws 401 missing_system_key when no key header', async () => {
		const ctx = makeCtx({ headers: { 'user-agent': 'test-agent' } });
		const err = await catchError(() => makeHook().handleBefore(ctx));
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(401);
		expect((err as APIError).body).toMatchObject({
			error: 'missing_system_key',
		});
	});

	it('throws 401 invalid_system_key when port returns null', async () => {
		const ctx = makeCtx({ systemResolution: undefined });
		const err = await catchError(() =>
			makeHook({ systemKeyPort: makeSystemKeyPort(null) }).handleBefore(ctx),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).body).toMatchObject({
			error: 'invalid_system_key',
		});
	});

	it('throws 401 system_inactive when system is suspended', async () => {
		const ctx = makeCtx({ systemResolution: undefined });
		const err = await catchError(() =>
			makeHook({
				systemKeyPort: makeSystemKeyPort(SUSPENDED_RESOLUTION),
			}).handleBefore(ctx),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).body).toMatchObject({ error: 'system_inactive' });
	});

	it('uses only x-system-key when both Authorization and x-system-key headers are present', async () => {
		const port = makeSystemKeyPort();
		const ctx = makeCtx({
			headers: {
				authorization: 'Bearer bearer-token',
				'x-system-key': 'other-key',
			},
			systemResolution: undefined,
		});
		await makeHook({ systemKeyPort: port }).handleBefore(ctx);
		expect(port.resolveSystemId).toHaveBeenCalledWith('other-key');
		expect(port.resolveSystemId).not.toHaveBeenCalledWith('bearer-token');
	});
});

// ---------------------------------------------------------------------------
// Tests — handleBefore() — captcha
// ---------------------------------------------------------------------------

describe('SignInHook.handleBefore() — captcha', () => {
	beforeEach(() => vi.clearAllMocks());

	it('throws APIError 400 CAPTCHA_FAILED when captchaToken is missing from body', async () => {
		const captchaService = makeCaptchaService({ success: false });
		const ctx = makeCtx({ body: {} });
		const err = await catchError(() =>
			makeHook({ captchaService }).handleBefore(ctx),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(400);
		expect((err as APIError).body).toMatchObject({ code: 'CAPTCHA_FAILED' });
	});

	it('throws APIError 400 CAPTCHA_FAILED when captchaService returns { success: false }', async () => {
		const captchaService = makeCaptchaService({ success: false });
		const ctx = makeCtx({
			body: { captchaToken: 'bad-token', email: 'user@example.com' },
		});
		const err = await catchError(() =>
			makeHook({ captchaService }).handleBefore(ctx),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(400);
		expect((err as APIError).body).toMatchObject({ code: 'CAPTCHA_FAILED' });
	});

	it('throws APIError 503 CAPTCHA_UNAVAILABLE when captchaService returns { unavailable: true }', async () => {
		const captchaService = makeCaptchaService({
			success: false,
			unavailable: true,
		} as never);
		const ctx = makeCtx({
			body: { captchaToken: 'any-token', email: 'user@example.com' },
		});
		const err = await catchError(() =>
			makeHook({ captchaService }).handleBefore(ctx),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(503);
		expect((err as APIError).body).toMatchObject({
			code: 'CAPTCHA_UNAVAILABLE',
		});
	});

	it('skips captchaService.verify entirely when SKIP_CAPTCHA=true', async () => {
		mockEnv.SKIP_CAPTCHA = true;
		try {
			const captchaService = makeCaptchaService();
			const ctx = makeCtx({ body: { email: 'user@example.com' } });
			await makeHook({ captchaService }).handleBefore(ctx);
			expect(captchaService.verify).not.toHaveBeenCalled();
		} finally {
			mockEnv.SKIP_CAPTCHA = false;
		}
	});

	it('does NOT skip captcha when SKIP_CAPTCHA is set to "false"', async () => {
		mockEnv.SKIP_CAPTCHA = false;
		const captchaService = makeCaptchaService({ success: false });
		const ctx = makeCtx({
			body: { captchaToken: 'bad', email: 'user@example.com' },
		});
		const err = await catchError(() =>
			makeHook({ captchaService }).handleBefore(ctx),
		);
		expect(captchaService.verify).toHaveBeenCalled();
		expect(err).toBeInstanceOf(APIError);
	});

	it('does NOT skip captcha when SKIP_CAPTCHA is set to "0"', async () => {
		mockEnv.SKIP_CAPTCHA = false;
		const captchaService = makeCaptchaService({ success: false });
		const ctx = makeCtx({
			body: { captchaToken: 'bad', email: 'user@example.com' },
		});
		const err = await catchError(() =>
			makeHook({ captchaService }).handleBefore(ctx),
		);
		expect(captchaService.verify).toHaveBeenCalled();
		expect(err).toBeInstanceOf(APIError);
	});
});

// ---------------------------------------------------------------------------
// Tests — handleBefore() — brute-force
// ---------------------------------------------------------------------------

describe('SignInHook.handleBefore() — brute-force', () => {
	beforeEach(() => vi.clearAllMocks());

	it('throws APIError 429 ACCOUNT_LOCKED and warns audit logger when count >= 5', async () => {
		const bruteForce = makeBruteForce(5);
		const ctx = makeCtx({
			body: { captchaToken: 'valid', email: 'user@example.com' },
		});
		const err = await catchError(() =>
			makeHook({ bruteForce }).handleBefore(ctx),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(429);
		expect((err as APIError).body).toMatchObject({ code: 'ACCOUNT_LOCKED' });
		expect(auditLogger.warn as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
			expect.objectContaining({ event: 'login_blocked' }),
		);
	});

	it('resolves without throwing when count is 4 (below threshold)', async () => {
		const bruteForce = makeBruteForce(4);
		const ctx = makeCtx({
			body: { captchaToken: 'valid', email: 'user@example.com' },
		});
		await expect(
			makeHook({ bruteForce }).handleBefore(ctx),
		).resolves.toBeUndefined();
	});
});

// ---------------------------------------------------------------------------
// Tests — handleAfter() — JWT minting
// ---------------------------------------------------------------------------

describe('SignInHook.handleAfter() — JWT minting', () => {
	beforeEach(() => vi.clearAllMocks());

	it('no-ops when systemResolution is absent from context (non-system request)', async () => {
		const jwkRepo = makeJwkRepo();
		const ctx = makeCtx({ systemResolution: undefined });
		delete ctx.context.systemResolution;
		await makeHook({ jwkRepo }).handleAfter(ctx);
		expect(jwkRepo.getActiveKey).not.toHaveBeenCalled();
	});

	it('no-ops when returned does not contain a user (failure path)', async () => {
		const jwkRepo = makeJwkRepo();
		const ctx = makeCtx({ returned: FAILURE_RETURNED });
		await makeHook({ jwkRepo }).handleAfter(ctx);
		expect(jwkRepo.getActiveKey).not.toHaveBeenCalled();
	});

	it('auto-enrolls member and mints JWT for open system with no prior membership', async () => {
		const membershipRepo = makeMembershipRepo(null);
		const jwtMintService = makeJwtMintService('jwt-token-001');
		const ctx = makeCtx();

		await makeHook({ membershipRepo, jwtMintService }).handleAfter(ctx);

		expect(membershipRepo.upsertMember).toHaveBeenCalledWith(
			expect.objectContaining({ userId: 'user-abc', role: 'member' }),
		);
		expect(jwtMintService.mint).toHaveBeenCalled();
		expect((ctx.context.returned as Record<string, unknown>).jwt).toBe(
			'jwt-token-001',
		);
	});

	it('does not upsert when membership already exists', async () => {
		const membershipRepo = makeMembershipRepo(ACTIVE_MEMBERSHIP);
		const ctx = makeCtx();
		await makeHook({ membershipRepo }).handleAfter(ctx);
		expect(membershipRepo.upsertMember).not.toHaveBeenCalled();
	});

	it('uses the existing membership role in the JWT payload', async () => {
		const membershipRepo = makeMembershipRepo(ACTIVE_MEMBERSHIP);
		const jwtMintService = makeJwtMintService();
		const ctx = makeCtx();
		await makeHook({ membershipRepo, jwtMintService }).handleAfter(ctx);
		expect(jwtMintService.mint).toHaveBeenCalledWith(
			expect.objectContaining({ role: 'admin' }),
			MOCK_JWK,
		);
	});

	it('throws AccessDeniedException for restricted system with no membership', async () => {
		const membershipRepo = makeMembershipRepo(null);
		const ctx = makeCtx({ systemResolution: RESTRICTED_RESOLUTION });
		const err = await catchError(() =>
			makeHook({ membershipRepo }).handleAfter(ctx),
		);
		expect(err).toBeInstanceOf(AccessDeniedException);
	});

	it('mints JWT with member role for restricted system with active membership', async () => {
		const membershipRepo = makeMembershipRepo(ACTIVE_MEMBERSHIP);
		const jwtMintService = makeJwtMintService('jwt-restricted');
		const ctx = makeCtx({ systemResolution: RESTRICTED_RESOLUTION });
		await makeHook({ membershipRepo, jwtMintService }).handleAfter(ctx);
		expect((ctx.context.returned as Record<string, unknown>).jwt).toBe(
			'jwt-restricted',
		);
	});

	it('skips JWT minting gracefully when no active JWK exists', async () => {
		const jwkRepo = makeJwkRepo(null);
		const ctx = makeCtx();
		await expect(
			makeHook({ jwkRepo }).handleAfter(ctx),
		).resolves.toBeUndefined();
		expect(
			(ctx.context.returned as Record<string, unknown>).jwt,
		).toBeUndefined();
	});

	it('writes jwt_issued audit event on success', async () => {
		const systemAuditLog = makeSystemAuditLog();
		const ctx = makeCtx();
		await makeHook({ systemAuditLog }).handleAfter(ctx);
		await Promise.resolve();
		expect(systemAuditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'jwt_issued', systemId: 'sys-001' }),
		);
	});

	it('writes open_system_auto_enrolled audit event when new member is created', async () => {
		const systemAuditLog = makeSystemAuditLog();
		const membershipRepo = makeMembershipRepo(null);
		const ctx = makeCtx();
		await makeHook({ systemAuditLog, membershipRepo }).handleAfter(ctx);
		await Promise.resolve();
		expect(systemAuditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'open_system_auto_enrolled' }),
		);
	});

	it('sets aud claim to apiBaseUrl from system resolution', async () => {
		const jwtMintService = makeJwtMintService();
		const ctx = makeCtx();
		await makeHook({ jwtMintService }).handleAfter(ctx);
		expect(jwtMintService.mint).toHaveBeenCalledWith(
			expect.objectContaining({ aud: 'https://api.example.com' }),
			expect.anything(),
		);
	});

	it('sets orgId claim to organizationId from system resolution', async () => {
		const jwtMintService = makeJwtMintService();
		const ctx = makeCtx();
		await makeHook({ jwtMintService }).handleAfter(ctx);
		expect(jwtMintService.mint).toHaveBeenCalledWith(
			expect.objectContaining({ orgId: 'org-001' }),
			expect.anything(),
		);
	});
});

// ---------------------------------------------------------------------------
// Tests — handleAfter() — brute-force clear on success
// ---------------------------------------------------------------------------

describe('SignInHook.handleAfter() — brute-force clear on success', () => {
	beforeEach(() => vi.clearAllMocks());

	it('calls bruteForce.clear with the key stored in ctx.context when login succeeds', async () => {
		const bruteForce = makeBruteForce();
		const ctx = makeCtx({ bruteForceKey: 'bf-key' });
		await makeHook({ bruteForce }).handleAfter(ctx);
		expect(bruteForce.clear).toHaveBeenCalledWith('bf-key');
	});
});

// Device cookie resolution and new-device/location detection are now handled
// by DeviceHook, which runs before SignInHook in the hook registration order.
// Those behaviours are covered in device.hooks.spec.ts.

// ---------------------------------------------------------------------------
// Tests — handleAfter() — failure path
// ---------------------------------------------------------------------------

describe('SignInHook.handleAfter() — failure path', () => {
	beforeEach(() => vi.clearAllMocks());

	it('calls bruteForce.increment when login fails and bruteForceKey is in context', async () => {
		const bruteForce = makeBruteForce(0);
		const ctx = makeCtx({
			returned: FAILURE_RETURNED,
			bruteForceKey: 'bf-key',
		});
		await makeHook({ bruteForce }).handleAfter(ctx);
		expect(bruteForce.increment).toHaveBeenCalledWith('bf-key');
	});

	it('logs account_locked audit event and records metric when increment count >= 5', async () => {
		const bruteForce = makeBruteForce(4);
		const systemAuditLog = makeSystemAuditLog();
		const ctx = makeCtx({
			returned: FAILURE_RETURNED,
			bruteForceKey: 'bf-key',
			systemResolution: ACTIVE_RESOLUTION,
		});

		await makeHook({ bruteForce, systemAuditLog }).handleAfter(ctx);
		await Promise.resolve();

		expect(systemAuditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'account_locked' }),
		);
		expect(recordAuthEvent as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
			'account_locked',
			expect.anything(),
		);
	});

	it('calls auditLogService.logLoginAttempt with success: false and failureReason', async () => {
		const auditLogService = makeAuditLogService();
		const ctx = makeCtx({
			returned: FAILURE_RETURNED,
			bruteForceKey: 'bf-key',
		});
		await makeHook({ auditLogService }).handleAfter(ctx);
		await Promise.resolve();
		expect(auditLogService.logLoginAttempt).toHaveBeenCalledWith(
			expect.objectContaining({
				success: false,
				failureReason: 'invalid_credentials',
			}),
		);
	});

	it('calls auditLogService.logLoginAttempt exactly once', async () => {
		const auditLogService = makeAuditLogService();
		const ctx = makeCtx({
			returned: FAILURE_RETURNED,
			bruteForceKey: 'bf-key',
		});
		await makeHook({ auditLogService }).handleAfter(ctx);
		await Promise.resolve();
		expect(auditLogService.logLoginAttempt).toHaveBeenCalledTimes(1);
	});

	it('calls logFailure (logLoginAttempt success: false) even when bruteForceKey is absent from context', async () => {
		const auditLogService = makeAuditLogService();
		const ctx = makeCtx({ returned: FAILURE_RETURNED });
		// bruteForceKey deliberately absent — no key in context
		delete ctx.context.bruteForceKey;

		await makeHook({ auditLogService }).handleAfter(ctx);
		await Promise.resolve();

		expect(auditLogService.logLoginAttempt).toHaveBeenCalledWith(
			expect.objectContaining({ success: false }),
		);
	});

	it('treats increment as >= maxAttempts (fail-closed) and logs brute_force_backend_failure when bruteForce.increment throws', async () => {
		const bruteForce: BruteForceServicePort = {
			increment: vi.fn().mockRejectedValue(new Error('Redis down')),
			getCount: vi.fn().mockResolvedValue(0),
			clear: vi.fn().mockResolvedValue(undefined),
		} as unknown as BruteForceServicePort;
		const systemAuditLog = makeSystemAuditLog();
		const ctx = makeCtx({
			returned: FAILURE_RETURNED,
			bruteForceKey: 'bf-key',
			systemResolution: ACTIVE_RESOLUTION,
		});

		await makeHook({ bruteForce, systemAuditLog }).handleAfter(ctx);
		await Promise.resolve();

		expect(auditLogger.warn as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
			expect.objectContaining({ event: 'brute_force_backend_failure' }),
		);
		// Fail-closed: account_locked audit event must fire
		expect(systemAuditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'account_locked' }),
		);
	});
});

// ---------------------------------------------------------------------------
// Tests — handleAfter() — success audit log
// ---------------------------------------------------------------------------

describe('SignInHook.handleAfter() — success audit log', () => {
	beforeEach(() => vi.clearAllMocks());

	it('calls auditLogService.logLoginAttempt with success: true, userId, systemId, and loginMethod', async () => {
		const auditLogService = makeAuditLogService();
		const ctx = makeCtx({ bruteForceKey: 'bf-key' });
		await makeHook({ auditLogService }).handleAfter(ctx);
		expect(auditLogService.logLoginAttempt).toHaveBeenCalledWith(
			expect.objectContaining({
				success: true,
				userId: 'user-abc',
				systemId: 'sys-001',
				loginMethod: 'email',
			}),
		);
	});

	it('includes deviceId from ctx.context.deviceId (set by DeviceHook before this hook)', async () => {
		const auditLogService = makeAuditLogService();
		const ctx = makeCtx({ deviceId: 'device-set-by-device-hook' });
		await makeHook({ auditLogService }).handleAfter(ctx);
		expect(auditLogService.logLoginAttempt).toHaveBeenCalledWith(
			expect.objectContaining({
				success: true,
				deviceId: 'device-set-by-device-hook',
			}),
		);
	});

	it('does not call auditLogService.logLoginAttempt(success: true) when systemResolution is absent', async () => {
		const auditLogService = makeAuditLogService();
		const ctx = makeCtx({ systemResolution: undefined });
		delete ctx.context.systemResolution;
		await makeHook({ auditLogService }).handleAfter(ctx);
		expect(auditLogService.logLoginAttempt).not.toHaveBeenCalledWith(
			expect.objectContaining({ success: true }),
		);
	});

	it('calls auditLogService.logLoginAttempt exactly once', async () => {
		const auditLogService = makeAuditLogService();
		const ctx = makeCtx({ bruteForceKey: 'bf-key' });
		await makeHook({ auditLogService }).handleAfter(ctx);
		expect(auditLogService.logLoginAttempt).toHaveBeenCalledTimes(1);
	});
});

// ---------------------------------------------------------------------------
// Tests — handleAfter() — logSuccess structured logging
// ---------------------------------------------------------------------------

describe('SignInHook.handleAfter() — logSuccess', () => {
	beforeEach(() => vi.clearAllMocks());

	it('writes auth.login.success to auditLogger.info with userId, provider, and resultStatus', async () => {
		const ctx = makeCtx({ returned: SUCCESS_RETURNED });
		await makeHook().handleAfter(ctx);
		expect(auditLogger.info as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
			expect.objectContaining({
				event: 'auth.login.success',
				provider: 'email',
				userId: 'user-abc',
				resultStatus: 'success',
			}),
		);
	});

	it('does not log raw IP — only ipHash appears in the success entry', async () => {
		const ctx = makeCtx({ returned: SUCCESS_RETURNED });
		await makeHook().handleAfter(ctx);
		const call = (auditLogger.info as ReturnType<typeof vi.fn>).mock
			.calls[0][0];
		expect(call).not.toHaveProperty('ip');
		expect(call).not.toHaveProperty('ipAddress');
		expect(call).toHaveProperty('ipHash');
	});

	it('does not call auditLogger.warn with auth.login.success on the success path', async () => {
		const ctx = makeCtx({ returned: SUCCESS_RETURNED });
		await makeHook().handleAfter(ctx);
		expect(auditLogger.warn).not.toHaveBeenCalledWith(
			expect.objectContaining({ event: 'auth.login.success' }),
		);
	});

	it('records auth.login.success metric with provider email', async () => {
		const ctx = makeCtx({ returned: SUCCESS_RETURNED });
		await makeHook().handleAfter(ctx);
		expect(recordAuthEvent).toHaveBeenCalledWith('auth.login.success', {
			provider: 'email',
		});
	});
});

// ---------------------------------------------------------------------------
// Tests — handleAfter() — logFailure structured logging
// ---------------------------------------------------------------------------

describe('SignInHook.handleAfter() — logFailure', () => {
	beforeEach(() => vi.clearAllMocks());

	it('writes auth.login.failure to auditLogger.warn with error_type, provider, and resultStatus', async () => {
		const ctx = makeCtx({
			returned: FAILURE_RETURNED,
			bruteForceKey: 'bf-key',
		});
		await makeHook().handleAfter(ctx);
		expect(auditLogger.warn as ReturnType<typeof vi.fn>).toHaveBeenCalledWith(
			expect.objectContaining({
				event: 'auth.login.failure',
				error_type: 'invalid_credentials',
				provider: 'email',
				resultStatus: 'failure',
			}),
		);
	});

	it('does not log raw IP — only ipHash appears in the failure entry', async () => {
		const ctx = makeCtx({
			returned: FAILURE_RETURNED,
			bruteForceKey: 'bf-key',
		});
		await makeHook().handleAfter(ctx);
		const failureCall = (
			auditLogger.warn as ReturnType<typeof vi.fn>
		).mock.calls.find(
			([arg]: [Record<string, unknown>]) => arg.event === 'auth.login.failure',
		)?.[0] as Record<string, unknown> | undefined;
		expect(failureCall).toBeDefined();
		expect(failureCall).not.toHaveProperty('ip');
		expect(failureCall).not.toHaveProperty('ipAddress');
		expect(failureCall).toHaveProperty('ipHash');
	});

	it('does not call auditLogger.info on the failure path', async () => {
		const ctx = makeCtx({
			returned: FAILURE_RETURNED,
			bruteForceKey: 'bf-key',
		});
		await makeHook().handleAfter(ctx);
		expect(auditLogger.info).not.toHaveBeenCalled();
	});

	it('records auth.login.failure metric with provider and error_type', async () => {
		const ctx = makeCtx({
			returned: FAILURE_RETURNED,
			bruteForceKey: 'bf-key',
		});
		await makeHook().handleAfter(ctx);
		expect(recordAuthEvent).toHaveBeenCalledWith('auth.login.failure', {
			provider: 'email',
			error_type: 'invalid_credentials',
		});
	});
});

// ---------------------------------------------------------------------------
// Tests — handleAfter() — failed login alert (S-014)
// ---------------------------------------------------------------------------

describe('SignInHook.handleAfter() — failed login alert', () => {
	beforeEach(() => vi.clearAllMocks());

	const MOCK_USER = {
		id: 'user-alert-test',
		email: { value: 'alert@example.com' },
		emailVerified: true,
		name: 'Alert Test',
		image: null,
		createdAt: new Date('2025-01-01'),
		updatedAt: new Date('2025-01-01'),
	};

	describe('threshold guard', () => {
		it('should not dispatch alert when count < maxAttempts', async () => {
			const userRepo = makeUserRepository(MOCK_USER);
			const emailService = makeEmailService();
			const bruteForce = makeBruteForce(3); // count = 4, maxAttempts = 5
			const ctx = makeCtx({
				returned: FAILURE_RETURNED,
				bruteForceKey: 'bf-key',
				body: { email: 'alert@example.com' },
			});

			await makeHook({
				bruteForce,
				emailService,
				userRepo,
			}).handleAfter(ctx);

			expect(
				(emailService.sendFailedLoginAlertEmail as ReturnType<typeof vi.fn>)
					.mock.calls.length,
			).toBe(0);
		});

		it('should dispatch alert when count === maxAttempts', async () => {
			const userRepo = makeUserRepository(MOCK_USER);
			const emailService = makeEmailService();
			const bruteForce = makeBruteForce(4); // count = 5, maxAttempts = 5
			const ctx = makeCtx({
				returned: FAILURE_RETURNED,
				bruteForceKey: 'bf-key',
				body: { email: 'alert@example.com' },
			});

			await makeHook({
				bruteForce,
				emailService,
				userRepo,
			}).handleAfter(ctx);

			await vi.waitFor(() => {
				expect(emailService.sendFailedLoginAlertEmail).toHaveBeenCalledWith(
					'alert@example.com',
					expect.objectContaining({
						twoFactorSuggested: true, // no 2FA found
					}),
				);
			});
		});

		it('should not dispatch alert when count > maxAttempts', async () => {
			const userRepo = makeUserRepository(MOCK_USER);
			const emailService = makeEmailService();
			const bruteForce = makeBruteForce(5); // count = 6, maxAttempts = 5
			const ctx = makeCtx({
				returned: FAILURE_RETURNED,
				bruteForceKey: 'bf-key',
				body: { email: 'alert@example.com' },
			});

			await makeHook({
				bruteForce,
				emailService,
				userRepo,
			}).handleAfter(ctx);

			expect(
				(emailService.sendFailedLoginAlertEmail as ReturnType<typeof vi.fn>)
					.mock.calls.length,
			).toBe(0);
		});
	});

	describe('user resolution', () => {
		it('should log audit event when user not found', async () => {
			const userRepo = makeUserRepository(null); // no user
			const systemAuditLog = makeSystemAuditLog();
			const bruteForce = makeBruteForce(4); // count = 5, threshold
			const ctx = makeCtx({
				returned: FAILURE_RETURNED,
				bruteForceKey: 'bf-key',
				body: { email: 'nonexistent@example.com' },
			});

			await makeHook({
				bruteForce,
				systemAuditLog,
				userRepo,
			}).handleAfter(ctx);

			expect(systemAuditLog.log).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'failed_login_alert_skipped_no_account',
				}),
			);
		});

		it('should dispatch alert with twoFactorSuggested=true when user has no 2FA', async () => {
			const userRepo = makeUserRepository(MOCK_USER);
			const twoFactorRepo = makeTwoFactorRepository(null); // no 2FA
			const emailService = makeEmailService();
			const bruteForce = makeBruteForce(4); // count = 5, threshold
			const ctx = makeCtx({
				returned: FAILURE_RETURNED,
				bruteForceKey: 'bf-key',
				body: { email: 'alert@example.com' },
			});

			await makeHook({
				bruteForce,
				emailService,
				userRepo,
				twoFactorRepo,
			}).handleAfter(ctx);

			await vi.waitFor(() => {
				expect(emailService.sendFailedLoginAlertEmail).toHaveBeenCalledWith(
					'alert@example.com',
					expect.objectContaining({
						twoFactorSuggested: true,
					}),
				);

				expect(
					(emailService.sendFailedLoginAlertEmail as ReturnType<typeof vi.fn>)
						.mock.calls[0][1],
				).toHaveProperty('twoFactorSettingsUrl');
			});
		});

		it('should dispatch alert with twoFactorSuggested=false when user has 2FA', async () => {
			const userRepo = makeUserRepository(MOCK_USER);
			const twoFactorRecord = {
				id: '2fa-001',
				userId: 'user-alert-test',
				method: 'totp' as const,
				enabled: true,
				verifiedAt: new Date(),
			};
			const twoFactorRepo = makeTwoFactorRepository(twoFactorRecord);
			const emailService = makeEmailService();
			const bruteForce = makeBruteForce(4); // count = 5, threshold
			const ctx = makeCtx({
				returned: FAILURE_RETURNED,
				bruteForceKey: 'bf-key',
				body: { email: 'alert@example.com' },
			});

			await makeHook({
				bruteForce,
				emailService,
				userRepo,
				twoFactorRepo,
			}).handleAfter(ctx);

			await vi.waitFor(() => {
				expect(emailService.sendFailedLoginAlertEmail).toHaveBeenCalledWith(
					'alert@example.com',
					expect.objectContaining({
						twoFactorSuggested: false,
					}),
				);
			});
		});
	});

	describe('email dispatch', () => {
		it('should not block login response if email dispatch fails', async () => {
			const userRepo = makeUserRepository(MOCK_USER);
			const emailService = makeEmailService();
			(
				emailService.sendFailedLoginAlertEmail as ReturnType<typeof vi.fn>
			).mockRejectedValue(new Error('SMTP error'));
			const bruteForce = makeBruteForce(4); // count = 5, threshold
			const ctx = makeCtx({
				returned: FAILURE_RETURNED,
				bruteForceKey: 'bf-key',
				body: { email: 'alert@example.com' },
			});

			// Should not throw
			await expect(
				makeHook({
					bruteForce,
					emailService,
					userRepo,
				}).handleAfter(ctx),
			).resolves.not.toThrow();
		});
	});

	describe('audit log', () => {
		it('should log with correct event type and targetUserId', async () => {
			const userRepo = makeUserRepository(MOCK_USER);
			const systemAuditLog = makeSystemAuditLog();
			const bruteForce = makeBruteForce(4); // count = 5, threshold
			const ctx = makeCtx({
				returned: FAILURE_RETURNED,
				bruteForceKey: 'bf-key',
				body: { email: 'alert@example.com' },
				correlationId: 'corr-123',
			});

			await makeHook({
				bruteForce,
				systemAuditLog,
				userRepo,
			}).handleAfter(ctx);

			await vi.waitFor(() => {
				expect(systemAuditLog.log).toHaveBeenCalledWith(
					expect.objectContaining({
						eventType: 'failed_login_alert_sent',
						targetUserId: 'user-alert-test',
						details: expect.objectContaining({
							two_factor_suggested: true,
							correlation_id: 'corr-123',
						}),
					}),
				);
			});
		});

		it('should include ipAddress and userAgent in audit log', async () => {
			const userRepo = makeUserRepository(MOCK_USER);
			const systemAuditLog = makeSystemAuditLog();
			const bruteForce = makeBruteForce(4); // count = 5, threshold
			const ctx = makeCtx({
				returned: FAILURE_RETURNED,
				bruteForceKey: 'bf-key',
				body: { email: 'alert@example.com' },
				headers: {
					'user-agent': 'test-agent/1.0',
					'x-forwarded-for': '192.168.1.100',
				},
			});

			await makeHook({
				bruteForce,
				systemAuditLog,
				userRepo,
			}).handleAfter(ctx);

			await vi.waitFor(() => {
				expect(systemAuditLog.log).toHaveBeenCalledWith(
					expect.objectContaining({
						eventType: 'failed_login_alert_sent',
						ipAddress: '192.168.1.100',
						userAgent: 'test-agent/1.0',
					}),
				);
			});
		});

		it('should not block login response if audit log fails', async () => {
			const userRepo = makeUserRepository(MOCK_USER);
			const systemAuditLog = makeSystemAuditLog();
			(systemAuditLog.log as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('Database error'),
			);
			const bruteForce = makeBruteForce(4); // count = 5, threshold
			const ctx = makeCtx({
				returned: FAILURE_RETURNED,
				bruteForceKey: 'bf-key',
				body: { email: 'alert@example.com' },
			});

			// Should not throw
			await expect(
				makeHook({
					bruteForce,
					systemAuditLog,
					userRepo,
				}).handleAfter(ctx),
			).resolves.not.toThrow();
			expect(systemAuditLog.log).toHaveBeenCalled();
		});
	});
});
