import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { GetTokenUseCasePort } from '../../../src/application/ports/in/get-token.use-case.port';
import type {
	BetterAuthOrgPort,
	SessionWithUser,
} from '../../../src/application/ports/out/better-auth-org.port';
import type { SystemKeyPort } from '../../../src/application/ports/out/system-key-service.port';
import { AccessDeniedException } from '../../../src/domain/exceptions/access-denied.exception';
import { SessionExpiredException } from '../../../src/domain/exceptions/session-expired.exception';
import { SessionInvalidatedException } from '../../../src/domain/exceptions/session-invalidated.exception';
import {
	type HandleTokenAfterParams,
	handleTokenAfter,
	TokenHook,
} from '../../../src/infrastructure/hooks/token.hooks';

// ---------------------------------------------------------------------------
// Shared fixtures
// ---------------------------------------------------------------------------

const MOCK_RESOLUTION = {
	systemId: 'sys-1',
	organizationId: 'org-1',
	accessModel: 'open' as const,
	apiBaseUrl: 'http://api.test',
	status: 'active' as const,
};

const MOCK_SESSION: SessionWithUser = {
	session: {
		id: 'sess-1',
		userId: 'user-1',
		createdAt: new Date('2025-01-01'),
		activeOrganizationId: 'org-1',
	},
	user: {
		id: 'user-1',
		email: 'user@test.com',
		emailVerified: true,
	},
};

function makeParams(
	overrides: Partial<HandleTokenAfterParams>,
): HandleTokenAfterParams {
	return {
		sessionWithUser: MOCK_SESSION,
		systemResolution: MOCK_RESOLUTION,
		getToken: { execute: vi.fn().mockResolvedValue({ token: 'jwt-token' }) },
		correlationId: 'corr-1',
		...overrides,
	};
}

// ---------------------------------------------------------------------------
// handleTokenAfter — pure function tests
// ---------------------------------------------------------------------------

describe('handleTokenAfter', () => {
	it('throws session_required when sessionWithUser is null', async () => {
		await expect(
			handleTokenAfter(makeParams({ sessionWithUser: null })),
		).rejects.toMatchObject({
			status: 401,
			body: { error: 'session_required' },
		});
	});

	it('throws invalid_system_key when activeOrganizationId is null', async () => {
		const session: SessionWithUser = {
			...MOCK_SESSION,
			session: { ...MOCK_SESSION.session, activeOrganizationId: null },
		};
		await expect(
			handleTokenAfter(makeParams({ sessionWithUser: session })),
		).rejects.toMatchObject({
			status: 401,
			body: { error: 'invalid_system_key' },
		});
	});

	it('throws invalid_system_key when org IDs do not match', async () => {
		const session: SessionWithUser = {
			...MOCK_SESSION,
			session: { ...MOCK_SESSION.session, activeOrganizationId: 'org-other' },
		};
		await expect(
			handleTokenAfter(makeParams({ sessionWithUser: session })),
		).rejects.toMatchObject({
			status: 401,
			body: { error: 'invalid_system_key' },
		});
	});

	it('converts SessionExpiredException to APIError 401', async () => {
		const params = makeParams({
			getToken: {
				execute: vi.fn().mockRejectedValue(new SessionExpiredException()),
			},
		});
		await expect(handleTokenAfter(params)).rejects.toMatchObject({
			status: 401,
			body: { message: 'AUTH_SESSION_EXPIRED' },
		});
	});

	it('converts SessionInvalidatedException to APIError 401', async () => {
		const params = makeParams({
			getToken: {
				execute: vi.fn().mockRejectedValue(new SessionInvalidatedException()),
			},
		});
		await expect(handleTokenAfter(params)).rejects.toMatchObject({
			status: 401,
			body: { message: 'AUTH_SESSION_INVALIDATED' },
		});
	});

	it('converts AccessDeniedException to APIError 403', async () => {
		const params = makeParams({
			getToken: {
				execute: vi.fn().mockRejectedValue(new AccessDeniedException()),
			},
		});
		await expect(handleTokenAfter(params)).rejects.toMatchObject({
			status: 403,
			body: { message: 'AUTH_ACCESS_DENIED' },
		});
	});

	it('returns token string from use case on valid session + matching org', async () => {
		const result = await handleTokenAfter(
			makeParams({
				getToken: {
					execute: vi.fn().mockResolvedValue({ token: 'system-scoped-jwt' }),
				},
			}),
		);
		expect(result).toBe('system-scoped-jwt');
	});

	it('calls use case with params derived from session and resolution', async () => {
		const execute = vi.fn().mockResolvedValue({ token: 'tok' });
		await handleTokenAfter(makeParams({ getToken: { execute } }));

		expect(execute).toHaveBeenCalledWith({
			userId: 'user-1',
			sessionId: 'sess-1',
			sessionCreatedAt: MOCK_SESSION.session.createdAt,
			email: 'user@test.com',
			emailVerified: true,
			systemContext: {
				systemId: 'sys-1',
				organizationId: 'org-1',
				accessModel: 'open',
				apiBaseUrl: 'http://api.test',
			},
			correlationId: 'corr-1',
		});
	});
});

// ---------------------------------------------------------------------------
// TokenHook class — @BeforeHook tests
// ---------------------------------------------------------------------------

function makeHook(
	resolveResult: Awaited<
		ReturnType<SystemKeyPort['resolveSystemId']>
	> = MOCK_RESOLUTION,
): {
	hook: TokenHook;
	systemKey: SystemKeyPort;
	getToken: GetTokenUseCasePort;
	baOrg: BetterAuthOrgPort;
} {
	const systemKey: SystemKeyPort = {
		resolveSystemId: vi.fn().mockResolvedValue(resolveResult),
	};
	const getToken: GetTokenUseCasePort = {
		execute: vi.fn().mockResolvedValue({ token: 'tok' }),
	};
	const baOrg: BetterAuthOrgPort = {
		createOrganization: vi.fn(),
		getSession: vi.fn().mockResolvedValue(MOCK_SESSION),
	};
	return {
		hook: new TokenHook(systemKey, getToken, baOrg),
		systemKey,
		getToken,
		baOrg,
	};
}

function makeBeforeCtx(xSystemKey = ''): {
	getHeader: (n: string) => string | null;
	context: Record<string, unknown>;
} {
	return {
		getHeader: (n: string) => {
			if (n === 'x-system-key') return xSystemKey;
			return null;
		},
		context: {},
	} as never;
}

describe('TokenHook.before', () => {
	let hook: TokenHook;
	let systemKey: SystemKeyPort;

	beforeEach(() => {
		({ hook, systemKey } = makeHook());
	});

	it('throws missing_system_key when neither header is present', async () => {
		await expect(hook.before(makeBeforeCtx() as never)).rejects.toMatchObject({
			status: 401,
			body: { error: 'missing_system_key' },
		});
	});

	it('throws invalid_system_key when resolveSystemId returns null', async () => {
		(systemKey.resolveSystemId as ReturnType<typeof vi.fn>).mockResolvedValue(
			null,
		);
		await expect(
			hook.before(makeBeforeCtx('Bearer bad-key') as never),
		).rejects.toMatchObject({
			status: 401,
			body: { error: 'invalid_system_key' },
		});
	});

	it('throws system_inactive when resolution.status is suspended', async () => {
		(systemKey.resolveSystemId as ReturnType<typeof vi.fn>).mockResolvedValue({
			...MOCK_RESOLUTION,
			status: 'suspended',
		});
		await expect(
			hook.before(makeBeforeCtx('Bearer valid-key') as never),
		).rejects.toMatchObject({
			status: 401,
			body: { error: 'system_inactive' },
		});
	});

	it('stores resolution in ctx.context on valid key', async () => {
		const ctx = makeBeforeCtx('Bearer valid-key');
		await hook.before(ctx as never);
		expect(ctx.context.systemResolution).toEqual(MOCK_RESOLUTION);
	});
});

// ---------------------------------------------------------------------------
// TokenHook.after — early return when before failed
// ---------------------------------------------------------------------------

describe('TokenHook.after', () => {
	it('returns early without throwing when systemResolution is absent', async () => {
		const { hook } = makeHook();
		const ctx = {
			request: new Request('http://localhost'),
			getHeader: () => null,
			context: {}, // no systemResolution
		};
		await expect(hook.after(ctx as never)).resolves.toBeUndefined();
	});
});
