import { InternalServerErrorException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GetTokenParams } from '../../../src/application/ports/in/get-token.use-case.port';
import type { JwkRepositoryPort } from '../../../src/application/ports/out/jwk-repository.port';
import type { JwtMintServicePort } from '../../../src/application/ports/out/jwt-mint-service.port';
import type { SessionAuditLogRepositoryPort } from '../../../src/application/ports/out/session-audit-log-repository.port';
import type { SessionRepositoryPort } from '../../../src/application/ports/out/session-repository.port';
import type { SystemAuditLogPort } from '../../../src/application/ports/out/system-audit-log.port';
import type { SystemMembershipRepositoryPort } from '../../../src/application/ports/out/system-membership-repository.port';
import { GetTokenUseCase } from '../../../src/application/use-cases/get-token.use-case';
import type { JwkEntity } from '../../../src/domain/entities/jwk.entity';
import type { SystemMembershipEntity } from '../../../src/domain/entities/system-membership.entity';
import { AccessDeniedException } from '../../../src/domain/exceptions/access-denied.exception';
import { SessionExpiredException } from '../../../src/domain/exceptions/session-expired.exception';
import { SessionInvalidatedException } from '../../../src/domain/exceptions/session-invalidated.exception';

vi.mock('../../../src/env', () => ({
	env: { SESSION_INACTIVITY_TIMEOUT_MINUTES: 30 },
}));

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const OPEN_CONTEXT = {
	systemId: 'sys-001',
	organizationId: 'org-001',
	accessModel: 'open' as const,
	apiBaseUrl: 'https://api.example.com',
};

const RESTRICTED_CONTEXT = {
	...OPEN_CONTEXT,
	accessModel: 'restricted' as const,
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

const SESSION_CREATED_AT = new Date('2024-01-01T00:00:00Z');

const BASE_PARAMS: GetTokenParams = {
	userId: 'user-abc',
	sessionId: 'sess-xyz',
	email: 'test@example.com',
	emailVerified: true,
	systemContext: OPEN_CONTEXT,
	sessionCreatedAt: SESSION_CREATED_AT,
	correlationId: 'corr-001',
};

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeMembershipRepo(
	existing: SystemMembershipEntity | null = null,
): SystemMembershipRepositoryPort {
	return {
		findByUserAndOrg: vi.fn().mockResolvedValue(existing),
		upsertMember: vi.fn().mockResolvedValue(undefined),
	};
}

function makeJwkRepo(jwk: JwkEntity | null = MOCK_JWK): JwkRepositoryPort {
	return {
		getActiveKey: vi.fn().mockResolvedValue(jwk),
		getAllVerificationKeys: vi.fn().mockResolvedValue([jwk]),
	};
}

function makeJwtMintService(token = 'minted-jwt'): JwtMintServicePort {
	return { mint: vi.fn().mockResolvedValue(token) };
}

function makeSystemAuditLog(): SystemAuditLogPort {
	return {
		log: vi.fn().mockResolvedValue(undefined),
	} as unknown as SystemAuditLogPort;
}

const VALID_SESSION_DATA = {
	session: {
		id: 'sess-xyz',
		createdAt: SESSION_CREATED_AT,
		userId: 'user-abc',
	},
	sessionInvalidBefore: null,
};

function makeSessionRepo(
	overrides: Partial<SessionRepositoryPort> = {},
): SessionRepositoryPort {
	return {
		revokeAllForUser: vi.fn().mockResolvedValue(0),
		deleteById: vi.fn().mockResolvedValue(undefined),
		findByIdWithUser: vi.fn().mockResolvedValue(VALID_SESSION_DATA),
		...overrides,
	};
}

function makeSessionAuditLog(): SessionAuditLogRepositoryPort {
	return { insertEvent: vi.fn().mockResolvedValue(undefined) };
}

function makeRedis(activity: string | null = '1') {
	return {
		get: vi.fn().mockResolvedValue(activity),
		expire: vi.fn().mockResolvedValue(1),
		del: vi.fn().mockResolvedValue(1),
	};
}

function makeUseCase({
	membershipRepo = makeMembershipRepo(ACTIVE_MEMBERSHIP),
	jwkRepo = makeJwkRepo(),
	jwtMintService = makeJwtMintService(),
	systemAuditLog = makeSystemAuditLog(),
	sessionRepo = makeSessionRepo(),
	sessionAuditLog = makeSessionAuditLog(),
	redis = makeRedis(),
}: {
	membershipRepo?: SystemMembershipRepositoryPort;
	jwkRepo?: JwkRepositoryPort;
	jwtMintService?: JwtMintServicePort;
	systemAuditLog?: SystemAuditLogPort;
	sessionRepo?: SessionRepositoryPort;
	sessionAuditLog?: SessionAuditLogRepositoryPort;
	redis?: ReturnType<typeof makeRedis>;
} = {}): GetTokenUseCase {
	return new GetTokenUseCase(
		membershipRepo,
		jwkRepo,
		jwtMintService,
		systemAuditLog,
		sessionRepo,
		sessionAuditLog,
		redis as never,
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
// Tests
// ---------------------------------------------------------------------------

describe('GetTokenUseCase', () => {
	beforeEach(() => vi.clearAllMocks());

	// --- Redis / session lifecycle checks (S-009) ---

	it('throws SessionExpiredException and deletes session when Redis key is missing', async () => {
		const redis = makeRedis(null);
		const sessionRepo = makeSessionRepo();
		const sessionAuditLog = makeSessionAuditLog();

		const err = await catchError(() =>
			makeUseCase({ redis, sessionRepo, sessionAuditLog }).execute(BASE_PARAMS),
		);

		expect(err).toBeInstanceOf(SessionExpiredException);
		expect(sessionRepo.deleteById).toHaveBeenCalledWith('sess-xyz');
		expect(sessionAuditLog.insertEvent).toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'session_expired_inactivity' }),
		);
	});

	it('throws SessionInvalidatedException when session was created before sessionInvalidBefore', async () => {
		const redis = makeRedis('1');
		const sessionRepo = makeSessionRepo({
			findByIdWithUser: vi.fn().mockResolvedValue({
				session: {
					id: 'sess-xyz',
					createdAt: SESSION_CREATED_AT,
					userId: 'user-abc',
				},
				// session created 2024-01-01, invalidated on 2024-02-01 → stale
				sessionInvalidBefore: new Date('2024-02-01T00:00:00Z'),
			}),
		});
		const sessionAuditLog = makeSessionAuditLog();

		const err = await catchError(() =>
			makeUseCase({ redis, sessionRepo, sessionAuditLog }).execute(BASE_PARAMS),
		);

		expect(err).toBeInstanceOf(SessionInvalidatedException);
		expect(sessionRepo.deleteById).toHaveBeenCalledWith('sess-xyz');
		expect(redis.del).toHaveBeenCalledWith('session:sess-xyz:activity');
		expect(sessionAuditLog.insertEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'session_invalidated_credential_change',
			}),
		);
	});

	it('throws SessionInvalidatedException and cleans up Redis when DB session is missing', async () => {
		const redis = makeRedis('1');
		const sessionRepo = makeSessionRepo({
			findByIdWithUser: vi.fn().mockResolvedValue(null),
		});
		const sessionAuditLog = makeSessionAuditLog();

		const err = await catchError(() =>
			makeUseCase({ redis, sessionRepo, sessionAuditLog }).execute(BASE_PARAMS),
		);

		expect(err).toBeInstanceOf(SessionInvalidatedException);
		expect(sessionRepo.deleteById).not.toHaveBeenCalled();
		expect(redis.del).toHaveBeenCalledWith('session:sess-xyz:activity');
		await Promise.resolve(); // flush fire-and-forget
		expect(sessionAuditLog.insertEvent).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'session_invalidated_credential_change',
				userId: 'user-abc',
				sessionId: 'sess-xyz',
				correlationId: 'corr-001',
				systemId: 'sys-001',
			}),
		);
	});

	it('slides the Redis TTL and writes session audit row on happy path', async () => {
		const redis = makeRedis('1');
		const sessionAuditLog = makeSessionAuditLog();

		const result = await makeUseCase({ redis, sessionAuditLog }).execute(
			BASE_PARAMS,
		);

		expect(redis.expire).toHaveBeenCalledWith(
			'session:sess-xyz:activity',
			expect.any(Number),
		);
		await Promise.resolve(); // flush fire-and-forget
		expect(sessionAuditLog.insertEvent).toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'jwt_refresh_succeeded' }),
		);
		expect(result.token).toBe('minted-jwt');
	});

	// --- Existing behaviour preserved ---

	it('auto-enrolls member and mints JWT for open system with no prior membership', async () => {
		const membershipRepo = makeMembershipRepo(null);
		const jwtMintService = makeJwtMintService('jwt-001');

		const result = await makeUseCase({
			membershipRepo,
			jwtMintService,
		}).execute(BASE_PARAMS);

		expect(membershipRepo.upsertMember).toHaveBeenCalledWith(
			expect.objectContaining({ userId: 'user-abc', role: 'member' }),
		);
		expect(result.token).toBe('jwt-001');
	});

	it('does not upsert when membership already exists', async () => {
		const membershipRepo = makeMembershipRepo(ACTIVE_MEMBERSHIP);
		await makeUseCase({ membershipRepo }).execute(BASE_PARAMS);
		expect(membershipRepo.upsertMember).not.toHaveBeenCalled();
	});

	it('mints JWT with the correct claims', async () => {
		const membershipRepo = makeMembershipRepo(ACTIVE_MEMBERSHIP);
		const jwtMintService = makeJwtMintService();

		await makeUseCase({ membershipRepo, jwtMintService }).execute(BASE_PARAMS);

		expect(jwtMintService.mint).toHaveBeenCalledWith(
			expect.objectContaining({
				sub: 'user-abc',
				email: 'test@example.com',
				emailVerified: true,
				sid: 'sess-xyz',
				orgId: 'org-001',
				role: 'admin',
				aud: 'https://api.example.com',
			}),
			MOCK_JWK,
		);
	});

	it('throws AccessDeniedException for restricted system with no membership', async () => {
		const membershipRepo = makeMembershipRepo(null);
		const err = await catchError(() =>
			makeUseCase({ membershipRepo }).execute({
				...BASE_PARAMS,
				systemContext: RESTRICTED_CONTEXT,
			}),
		);
		expect(err).toBeInstanceOf(AccessDeniedException);
	});

	it('mints JWT for restricted system with active membership', async () => {
		const membershipRepo = makeMembershipRepo(ACTIVE_MEMBERSHIP);
		const jwtMintService = makeJwtMintService('jwt-restricted');

		const result = await makeUseCase({
			membershipRepo,
			jwtMintService,
		}).execute({
			...BASE_PARAMS,
			systemContext: RESTRICTED_CONTEXT,
		});
		expect(result.token).toBe('jwt-restricted');
	});

	it('throws InternalServerErrorException when no active JWK exists', async () => {
		const jwkRepo = makeJwkRepo(null);
		const membershipRepo = makeMembershipRepo(ACTIVE_MEMBERSHIP);
		const err = await catchError(() =>
			makeUseCase({ jwkRepo, membershipRepo }).execute(BASE_PARAMS),
		);
		expect(err).toBeInstanceOf(InternalServerErrorException);
	});

	it('writes jwt_refresh_succeeded system audit event on success', async () => {
		const systemAuditLog = makeSystemAuditLog();
		const membershipRepo = makeMembershipRepo(ACTIVE_MEMBERSHIP);
		await makeUseCase({ systemAuditLog, membershipRepo }).execute(BASE_PARAMS);
		await Promise.resolve();
		expect(systemAuditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'jwt_refresh_succeeded',
				systemId: 'sys-001',
			}),
		);
	});

	it('writes open_system_auto_enrolled audit event when new member is created', async () => {
		const systemAuditLog = makeSystemAuditLog();
		const membershipRepo = makeMembershipRepo(null);
		await makeUseCase({ systemAuditLog, membershipRepo }).execute(BASE_PARAMS);
		await Promise.resolve();
		expect(systemAuditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'open_system_auto_enrolled' }),
		);
	});
});
