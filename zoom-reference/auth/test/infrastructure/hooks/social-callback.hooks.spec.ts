import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module-level mocks — must be at top level for vi.mock hoisting
// ---------------------------------------------------------------------------

vi.mock('better-auth/api', () => ({
	getOAuthState: vi.fn(),
}));

vi.mock('../../../src/shared/metrics/auth-metrics', () => ({
	recordAuthEvent: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import type { IStructuredLogger } from '@zoom/utils';
import { APIError } from 'better-auth';
import { getOAuthState } from 'better-auth/api';
import type {
	AuditLogServicePort,
	LoginAttemptParams,
	SocialAuthAuditParams,
} from '../../../src/application/ports/out/audit-log-service.port';
import type { JwkRepositoryPort } from '../../../src/application/ports/out/jwk-repository.port';
import type { JwtMintServicePort } from '../../../src/application/ports/out/jwt-mint-service.port';
import type { OAuthSystemContextStorePort } from '../../../src/application/ports/out/oauth-system-context-store.port';
import type { PendingTermsEntry } from '../../../src/application/ports/out/pending-terms-store.port';
import { PendingTermsStorePort } from '../../../src/application/ports/out/pending-terms-store.port';
import type { SystemAuditLogPort } from '../../../src/application/ports/out/system-audit-log.port';
import type { SystemContext } from '../../../src/application/ports/out/system-key-service.port';
import type { SystemMembershipRepositoryPort } from '../../../src/application/ports/out/system-membership-repository.port';
import { UserTermsAcceptanceRepositoryPort } from '../../../src/application/ports/out/user-terms-acceptance-repository.port';
import { SocialCallbackHook } from '../../../src/infrastructure/hooks/social-callback.hooks';
import { recordAuthEvent } from '../../../src/shared/metrics/auth-metrics';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CORRELATION_ID = 'cccccccc-cccc-4ccc-cccc-cccccccccccc';
const USER_ID = 'user-123';
const SYSTEM_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const SYSTEM_TERMS_ID = 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb';

const SYSTEM_CTX: SystemContext = {
	systemId: SYSTEM_ID,
	organizationId: 'org-001',
	accessModel: 'open',
	apiBaseUrl: 'https://api.example.com',
};

const VALID_ENTRY: PendingTermsEntry = {
	systemTermsId: SYSTEM_TERMS_ID,
	systemId: SYSTEM_ID,
	provider: 'google',
	ipAddress: '1.2.3.4',
	userAgent: 'test-agent',
	termsAcceptedAt: new Date().toISOString(),
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeCtx(
	overrides: {
		hasRequest?: boolean;
		newSession?: unknown;
		headers?: Record<string, string>;
		context?: Record<string, unknown>;
		deviceId?: string;
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
				: ({ method: 'GET' } as unknown as Request),
		path: '/callback/google',
		context: {
			...(overrides.context ?? {}),
			newSession: overrides.newSession ?? {
				session: { token: 'sess-tok', id: 'session-id-1', userId: USER_ID },
				user: { id: USER_ID, email: 'user@example.com', emailVerified: true },
			},
			// deviceId pre-populated as if DeviceHook already ran
			deviceId: overrides.deviceId,
		},
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

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

class MockTermsAcceptanceRepo extends UserTermsAcceptanceRepositoryPort {
	create = vi.fn().mockResolvedValue(undefined);
}

// ---------------------------------------------------------------------------
// SocialCallbackHook — before()
// ---------------------------------------------------------------------------

describe('SocialCallbackHook.before()', () => {
	let mockAuditLogService: AuditLogServicePort;
	let mockPendingTermsStore: PendingTermsStorePort;
	let mockTermsAcceptanceRepo: MockTermsAcceptanceRepo;
	let mockLogger: IStructuredLogger;
	let mockJwkRepo: JwkRepositoryPort;
	let mockJwtMintService: JwtMintServicePort;
	let mockMembershipRepo: SystemMembershipRepositoryPort;
	let mockSystemAuditLog: SystemAuditLogPort;
	let mockOAuthSystemCtxStore: OAuthSystemContextStorePort;

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuditLogService = {
			logLoginAttempt: vi
				.fn<(params: LoginAttemptParams) => Promise<void>>()
				.mockResolvedValue(undefined),
			logSignupEvent: vi.fn(),
			logSocialAuthEvent: vi
				.fn<(params: SocialAuthAuditParams) => Promise<void>>()
				.mockResolvedValue(undefined),
		} as unknown as AuditLogServicePort;

		mockPendingTermsStore = {
			set: vi.fn().mockResolvedValue(undefined),
			get: vi.fn().mockResolvedValue(null),
			consume: vi.fn().mockResolvedValue(null),
		};

		mockTermsAcceptanceRepo = new MockTermsAcceptanceRepo();

		mockLogger = {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		} as unknown as IStructuredLogger;

		mockJwkRepo = {
			getActiveKey: vi.fn().mockResolvedValue(null),
		} as unknown as JwkRepositoryPort;

		mockJwtMintService = {
			mint: vi.fn().mockResolvedValue('mock-token'),
		} as unknown as JwtMintServicePort;

		mockMembershipRepo = {
			findByUserAndOrg: vi.fn().mockResolvedValue({
				role: 'member',
				status: 'active',
				isDeleted: false,
			}),
			upsertMember: vi.fn().mockResolvedValue(undefined),
		} as unknown as SystemMembershipRepositoryPort;

		mockSystemAuditLog = {
			log: vi.fn().mockResolvedValue(undefined),
		} as unknown as SystemAuditLogPort;

		mockOAuthSystemCtxStore = {
			set: vi.fn().mockResolvedValue(undefined),
			get: vi.fn().mockResolvedValue(null),
			consume: vi.fn().mockResolvedValue(null),
		};
	});

	function makeHook(): SocialCallbackHook {
		return new SocialCallbackHook(
			mockPendingTermsStore,
			mockAuditLogService,
			mockTermsAcceptanceRepo,
			mockLogger,
			mockJwkRepo,
			mockJwtMintService,
			mockMembershipRepo,
			mockSystemAuditLog,
			mockOAuthSystemCtxStore,
		);
	}

	it('returns without error when ctx.request is absent', async () => {
		await expect(
			makeHook().before(makeCtx({ hasRequest: false })),
		).resolves.toBeUndefined();
	});

	it('injects auditLogService into ctx.context', async () => {
		const ctx = makeCtx();
		await makeHook().before(ctx);
		expect(ctx.context.auditLogService).toBe(mockAuditLogService);
	});

	it('injects systemAuditLog into ctx.context', async () => {
		const ctx = makeCtx();
		await makeHook().before(ctx);
		expect(ctx.context.systemAuditLog).toBe(mockSystemAuditLog);
	});

	it('injects oauthSystemCtxStore into ctx.context for databaseHook resolution', async () => {
		const ctx = makeCtx();
		await makeHook().before(ctx);
		expect(ctx.context.oauthSystemCtxStore).toBe(mockOAuthSystemCtxStore);
	});
});

// ---------------------------------------------------------------------------
// SocialCallbackHook — after()
// ---------------------------------------------------------------------------

describe('SocialCallbackHook.after()', () => {
	let mockAuditLogService: AuditLogServicePort;
	let mockPendingTermsStore: PendingTermsStorePort;
	let mockTermsAcceptanceRepo: MockTermsAcceptanceRepo;
	let mockLogger: IStructuredLogger;
	let mockJwkRepo: JwkRepositoryPort;
	let mockJwtMintService: JwtMintServicePort;
	let mockMembershipRepo: SystemMembershipRepositoryPort;
	let mockSystemAuditLog: SystemAuditLogPort;
	let mockOAuthSystemCtxStore: OAuthSystemContextStorePort;

	beforeEach(() => {
		vi.clearAllMocks();

		mockAuditLogService = {
			logLoginAttempt: vi
				.fn<(params: LoginAttemptParams) => Promise<void>>()
				.mockResolvedValue(undefined),
			logSignupEvent: vi.fn(),
			logSocialAuthEvent: vi
				.fn<(params: SocialAuthAuditParams) => Promise<void>>()
				.mockResolvedValue(undefined),
		} as unknown as AuditLogServicePort;

		mockPendingTermsStore = {
			set: vi.fn().mockResolvedValue(undefined),
			get: vi.fn().mockResolvedValue(null),
			consume: vi.fn().mockResolvedValue({ ...VALID_ENTRY }),
		};

		mockTermsAcceptanceRepo = new MockTermsAcceptanceRepo();

		mockLogger = {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			debug: vi.fn(),
		} as unknown as IStructuredLogger;

		mockJwkRepo = {
			getActiveKey: vi.fn().mockResolvedValue(null),
		} as unknown as JwkRepositoryPort;

		mockJwtMintService = {
			mint: vi.fn().mockResolvedValue('mock-token'),
		} as unknown as JwtMintServicePort;

		mockMembershipRepo = {
			findByUserAndOrg: vi.fn().mockResolvedValue({
				role: 'member',
				status: 'active',
				isDeleted: false,
			}),
			upsertMember: vi.fn().mockResolvedValue(undefined),
		} as unknown as SystemMembershipRepositoryPort;

		mockSystemAuditLog = {
			log: vi.fn().mockResolvedValue(undefined),
		} as unknown as SystemAuditLogPort;

		mockOAuthSystemCtxStore = {
			set: vi.fn().mockResolvedValue(undefined),
			get: vi.fn().mockResolvedValue(null),
			consume: vi.fn().mockResolvedValue({ ...SYSTEM_CTX }),
		};

		(getOAuthState as ReturnType<typeof vi.fn>).mockResolvedValue({
			correlationId: CORRELATION_ID,
			callbackURL: 'https://example.com/callback',
			codeVerifier: 'cv',
			expiresAt: Date.now() + 60_000,
		});
	});

	function makeHook(): SocialCallbackHook {
		return new SocialCallbackHook(
			mockPendingTermsStore,
			mockAuditLogService,
			mockTermsAcceptanceRepo,
			mockLogger,
			mockJwkRepo,
			mockJwtMintService,
			mockMembershipRepo,
			mockSystemAuditLog,
			mockOAuthSystemCtxStore,
		);
	}

	// ── early exits ───────────────────────────────────────────────────────────

	it('returns without error when ctx.request is absent', async () => {
		await expect(
			makeHook().after(makeCtx({ hasRequest: false })),
		).resolves.toBeUndefined();
		expect(mockPendingTermsStore.consume).not.toHaveBeenCalled();
	});

	it('throws 401 oauth_context_lost when system context store returns null', async () => {
		mockOAuthSystemCtxStore.consume = vi.fn().mockResolvedValue(null);
		const err = await catchError(() => makeHook().after(makeCtx()));
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(401);
		expect((err as APIError).body).toMatchObject({
			error: 'oauth_context_lost',
		});
	});

	it('throws 401 oauth_context_lost when correlationId is missing from OAuth state', async () => {
		(getOAuthState as ReturnType<typeof vi.fn>).mockResolvedValue({
			callbackURL: 'https://example.com',
			codeVerifier: 'cv',
			expiresAt: Date.now() + 60_000,
		});
		const err = await catchError(() => makeHook().after(makeCtx()));
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(401);
		expect((err as APIError).body).toMatchObject({
			error: 'oauth_context_lost',
		});
	});

	it('throws 401 oauth_context_lost when getOAuthState returns null', async () => {
		(getOAuthState as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		const err = await catchError(() => makeHook().after(makeCtx()));
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(401);
	});

	it('returns without consuming pending terms when consume returns null (already consumed or expired)', async () => {
		mockPendingTermsStore.consume = vi.fn().mockResolvedValue(null);
		await expect(makeHook().after(makeCtx())).resolves.toBeUndefined();
	});

	it('returns without error when newSession has no user id', async () => {
		await expect(
			makeHook().after(makeCtx({ newSession: { user: {} } })),
		).resolves.toBeUndefined();
	});

	it('returns without error when newSession is absent', async () => {
		const ctx = makeCtx();
		ctx.context.newSession = undefined;
		await expect(makeHook().after(ctx)).resolves.toBeUndefined();
	});

	// ── happy path ────────────────────────────────────────────────────────────

	it('consumes system context from oauthSystemCtxStore with correlationId', async () => {
		await makeHook().after(makeCtx());
		expect(mockOAuthSystemCtxStore.consume).toHaveBeenCalledWith(
			CORRELATION_ID,
		);
	});

	it('calls pendingTermsStore.consume with the correlationId from OAuth state', async () => {
		await makeHook().after(makeCtx());
		expect(mockPendingTermsStore.consume).toHaveBeenCalledWith(CORRELATION_ID);
	});

	it('calls termsAcceptanceRepo.create with correct data', async () => {
		await makeHook().after(makeCtx());
		expect(mockTermsAcceptanceRepo.create).toHaveBeenCalledOnce();
		expect(mockTermsAcceptanceRepo.create).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: USER_ID,
				systemId: SYSTEM_ID,
				systemTermsId: SYSTEM_TERMS_ID,
				sessionId: null,
			}),
		);
	});

	it('emits social_auth_succeeded telemetry on happy path', async () => {
		await makeHook().after(makeCtx());
		await Promise.resolve();
		expect(recordAuthEvent).toHaveBeenCalledWith('social_auth_succeeded', {
			provider: 'google',
		});
	});

	it('calls logSocialAuthEvent with social_signup_success on happy path', async () => {
		await makeHook().after(makeCtx());
		await Promise.resolve();
		expect(mockAuditLogService.logSocialAuthEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'social_signup_success',
				correlationId: CORRELATION_ID,
				userId: USER_ID,
			}),
		);
	});

	it('passes correct providerId from pending entry to audit log', async () => {
		await makeHook().after(makeCtx());
		await Promise.resolve();
		expect(mockAuditLogService.logSocialAuthEvent).toHaveBeenCalledWith(
			expect.objectContaining({ providerId: 'google' }),
		);
	});

	it('passes hashed IP to audit log', async () => {
		const expectedHash = createHash('sha256').update('1.2.3.4').digest('hex');
		await makeHook().after(makeCtx());
		await Promise.resolve();
		expect(mockAuditLogService.logSocialAuthEvent).toHaveBeenCalledWith(
			expect.objectContaining({ ipHash: expectedHash }),
		);
	});

	// ── resilience ────────────────────────────────────────────────────────────

	it('does not throw when termsAcceptanceRepo.create rejects (logs warning)', async () => {
		const constraintErr = Object.assign(new Error('unique violation'), {
			code: '23505',
		});
		mockTermsAcceptanceRepo.create.mockRejectedValue(constraintErr);

		await expect(makeHook().after(makeCtx())).resolves.toBeUndefined();
		expect(mockLogger.error).toHaveBeenCalled();
	});

	it('does not throw when logSocialAuthEvent rejects', async () => {
		(
			mockAuditLogService.logSocialAuthEvent as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error('DB down'));
		await expect(makeHook().after(makeCtx())).resolves.toBeUndefined();
	});

	// ── login attempt audit log ───────────────────────────────────────────────

	it('calls logLoginAttempt with success: true, userId, systemId, and provider as loginMethod', async () => {
		await makeHook().after(makeCtx());

		expect(mockAuditLogService.logLoginAttempt).toHaveBeenCalledWith(
			expect.objectContaining({
				success: true,
				userId: USER_ID,
				systemId: SYSTEM_ID,
				loginMethod: 'google',
			}),
		);
	});

	it('falls back to loginMethod: "social" when no pending terms entry exists (returning user)', async () => {
		mockPendingTermsStore.consume = vi.fn().mockResolvedValue(null);

		await makeHook().after(makeCtx());

		expect(mockAuditLogService.logLoginAttempt).toHaveBeenCalledWith(
			expect.objectContaining({
				success: true,
				loginMethod: 'social',
			}),
		);
	});

	it('includes correlationId in logLoginAttempt', async () => {
		await makeHook().after(makeCtx());

		expect(mockAuditLogService.logLoginAttempt).toHaveBeenCalledWith(
			expect.objectContaining({ correlationId: CORRELATION_ID }),
		);
	});

	it('does not call logLoginAttempt when userId is absent', async () => {
		const ctx = makeCtx({ newSession: { user: {} } });

		await makeHook().after(ctx);

		expect(mockAuditLogService.logLoginAttempt).not.toHaveBeenCalled();
	});

	it('includes deviceId from ctx.context.deviceId (set by DeviceHook before this hook)', async () => {
		const ctx = makeCtx({ deviceId: 'device-set-by-device-hook' });

		await makeHook().after(ctx);

		expect(mockAuditLogService.logLoginAttempt).toHaveBeenCalledWith(
			expect.objectContaining({ deviceId: 'device-set-by-device-hook' }),
		);
	});
});
