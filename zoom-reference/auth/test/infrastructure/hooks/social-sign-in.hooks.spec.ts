import { APIError } from 'better-auth';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module-level mock declarations — must be at top level for vi.mock hoisting
// ---------------------------------------------------------------------------

const mockEnv = vi.hoisted(() => ({
	SKIP_CAPTCHA: false as boolean,
	NODE_ENV: 'test' as string,
}));

vi.mock('../../../src/env', () => ({ env: mockEnv }));

vi.mock('../../../src/shared/metrics/auth-metrics', () => ({
	recordAuthEvent: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks so they resolve the mocked versions)
// ---------------------------------------------------------------------------

import type {
	AuditLogServicePort,
	SocialAuthAuditParams,
} from '../../../src/application/ports/out/audit-log-service.port';
import type {
	CaptchaServicePort,
	CaptchaVerifyResult,
} from '../../../src/application/ports/out/captcha-service.port';
import type { OAuthSystemContextStorePort } from '../../../src/application/ports/out/oauth-system-context-store.port';
import type { PendingTermsStorePort } from '../../../src/application/ports/out/pending-terms-store.port';
import type { SystemKeyPort } from '../../../src/application/ports/out/system-key-service.port';
import type {
	ActiveTermsRecord,
	TermsRepositoryPort,
} from '../../../src/application/ports/out/terms-repository.port';
import { SocialSignInHook } from '../../../src/infrastructure/hooks/social-sign-in.hooks';
import { recordAuthEvent } from '../../../src/shared/metrics/auth-metrics';

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const VALID_TERMS_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const VALID_SYSTEM_ID = 'sys-001';

const VALID_BODY = {
	provider: 'google',
	callbackURL: 'https://example.com/callback',
	additionalData: {
		captchaToken: 'tok-abc',
		captchaVersion: 'v3',
		systemTermsId: VALID_TERMS_ID,
	},
};

const VALID_TERMS_RECORD: ActiveTermsRecord = {
	id: VALID_TERMS_ID,
	version: '1.0',
	title: 'Terms of Service',
	content: null,
	effectiveAt: new Date('2024-01-01'),
};

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeCtx(
	overrides: {
		body?: object;
		hasRequest?: boolean;
		headers?: Record<string, string>;
	} = {},
	// biome-ignore lint/suspicious/noExplicitAny: structural mock for AuthHookContext
): any {
	const headers: Record<string, string> = overrides.headers ?? {
		'user-agent': 'test-agent',
		'x-system-key': 'valid-system-key',
	};
	return {
		request:
			overrides.hasRequest === false
				? undefined
				: ({ method: 'POST' } as unknown as Request),
		path: '/sign-in/social',
		body: overrides.body ?? { ...VALID_BODY },
		context: {},
		getHeader: (name: string) => headers[name.toLowerCase()] ?? null,
	};
}

const ACTIVE_RESOLUTION = {
	systemId: VALID_SYSTEM_ID,
	organizationId: 'org-001',
	accessModel: 'open' as const,
	apiBaseUrl: 'https://api.example.com',
	status: 'active' as const,
};

function makeSystemKeyService(
	resolution: typeof ACTIVE_RESOLUTION | null = ACTIVE_RESOLUTION,
): SystemKeyPort {
	return { resolveSystemId: vi.fn().mockResolvedValue(resolution) };
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
// Tests — SocialSignInHook.handleBefore()
// ---------------------------------------------------------------------------

describe('SocialSignInHook.handleBefore()', () => {
	let mockTermsRepository: TermsRepositoryPort;
	let mockCaptchaService: CaptchaServicePort;
	let mockAuditLogService: AuditLogServicePort;
	let mockSystemKeyService: SystemKeyPort;
	let mockPendingTermsStore: PendingTermsStorePort;
	let mockOAuthSystemCtxStore: OAuthSystemContextStorePort;

	beforeEach(() => {
		vi.clearAllMocks();
		mockEnv.SKIP_CAPTCHA = false;

		mockTermsRepository = {
			findActiveBySystemId: vi
				.fn<TermsRepositoryPort['findActiveBySystemId']>()
				.mockResolvedValue(VALID_TERMS_RECORD),
		};

		mockCaptchaService = {
			verify: vi.fn<CaptchaServicePort['verify']>().mockResolvedValue({
				success: true,
				score: 0.9,
			} satisfies CaptchaVerifyResult),
		};

		mockAuditLogService = {
			logLoginAttempt: vi.fn(),
			logSignupEvent: vi.fn(),
			logSocialAuthEvent: vi
				.fn<(params: SocialAuthAuditParams) => Promise<void>>()
				.mockResolvedValue(undefined),
		} as unknown as AuditLogServicePort;

		mockSystemKeyService = makeSystemKeyService();

		mockPendingTermsStore = {
			set: vi.fn().mockResolvedValue(undefined),
			get: vi.fn().mockResolvedValue(null),
			consume: vi.fn().mockResolvedValue(null),
		};

		mockOAuthSystemCtxStore = {
			set: vi.fn().mockResolvedValue(undefined),
			get: vi.fn().mockResolvedValue(null),
			consume: vi.fn().mockResolvedValue(null),
		};
	});

	afterEach(() => {
		mockEnv.SKIP_CAPTCHA = false;
	});

	function makeHook(): SocialSignInHook {
		return new SocialSignInHook(
			mockPendingTermsStore,
			mockCaptchaService,
			mockTermsRepository,
			mockSystemKeyService,
			mockAuditLogService,
			mockOAuthSystemCtxStore,
		);
	}

	// ── early exit ────────────────────────────────────────────────────────────

	it('returns without error when ctx.request is absent', async () => {
		await expect(
			makeHook().handleBefore(makeCtx({ hasRequest: false })),
		).resolves.toBeUndefined();
		expect(mockPendingTermsStore.set).not.toHaveBeenCalled();
	});

	// ── SKIP_CAPTCHA env flag ─────────────────────────────────────────────────

	it('skips captcha token check and verification when SKIP_CAPTCHA is set', async () => {
		mockEnv.SKIP_CAPTCHA = true;
		// No captchaToken in the body — would normally throw 422
		const body = {
			...VALID_BODY,
			additionalData: { systemTermsId: VALID_TERMS_ID },
		};
		await expect(
			makeHook().handleBefore(makeCtx({ body })),
		).resolves.toBeUndefined();
		expect(mockCaptchaService.verify).not.toHaveBeenCalled();
	});

	// ── captchaToken validation ───────────────────────────────────────────────

	it('throws 422 captcha_token_required when captchaToken is absent', async () => {
		const body = {
			...VALID_BODY,
			additionalData: { systemTermsId: VALID_TERMS_ID },
		};
		const err = await catchError(() =>
			makeHook().handleBefore(makeCtx({ body })),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
		expect((err as APIError).body).toMatchObject({
			error: 'captcha_token_required',
		});
	});

	it('throws 422 captcha_token_required when captchaToken is an empty string', async () => {
		const body = {
			...VALID_BODY,
			additionalData: { ...VALID_BODY.additionalData, captchaToken: '' },
		};
		const err = await catchError(() =>
			makeHook().handleBefore(makeCtx({ body })),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
		expect((err as APIError).body).toMatchObject({
			error: 'captcha_token_required',
		});
	});

	it('does not call pendingTermsStore.set when captchaToken is absent', async () => {
		const body = {
			...VALID_BODY,
			additionalData: { systemTermsId: VALID_TERMS_ID },
		};
		await catchError(() => makeHook().handleBefore(makeCtx({ body })));
		expect(mockPendingTermsStore.set).not.toHaveBeenCalled();
	});

	// ── system key validation ─────────────────────────────────────────────────

	it('throws 401 missing_system_key when no key header is present', async () => {
		const err = await catchError(() =>
			makeHook().handleBefore(
				makeCtx({ headers: { 'user-agent': 'test-agent' } }),
			),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(401);
		expect((err as APIError).body).toMatchObject({
			error: 'missing_system_key',
		});
	});

	it('throws 401 missing_system_key when x-system-key is whitespace only', async () => {
		const err = await catchError(() =>
			makeHook().handleBefore(
				makeCtx({
					headers: { 'user-agent': 'test-agent', 'x-system-key': '   ' },
				}),
			),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).body).toMatchObject({
			error: 'missing_system_key',
		});
	});

	it('throws 401 invalid_system_key when system key service returns null', async () => {
		mockSystemKeyService = makeSystemKeyService(null);
		const err = await catchError(() => makeHook().handleBefore(makeCtx()));
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(401);
		expect((err as APIError).body).toMatchObject({
			error: 'invalid_system_key',
		});
	});

	it('throws 401 system_inactive when system is suspended', async () => {
		mockSystemKeyService = makeSystemKeyService({
			...ACTIVE_RESOLUTION,
			status: 'suspended' as const,
		});
		const err = await catchError(() => makeHook().handleBefore(makeCtx()));
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(401);
		expect((err as APIError).body).toMatchObject({ error: 'system_inactive' });
	});

	it('uses only x-system-key when both Authorization and x-system-key headers are present', async () => {
		await makeHook().handleBefore(
			makeCtx({
				headers: {
					authorization: 'Bearer bearer-token',
					'x-system-key': 'other-key',
					'user-agent': 'test-agent',
				},
			}),
		);
		expect(mockSystemKeyService.resolveSystemId).toHaveBeenCalledWith(
			'other-key',
		);
		expect(mockSystemKeyService.resolveSystemId).not.toHaveBeenCalledWith(
			'bearer-token',
		);
	});

	it('does not call pendingTermsStore.set when system key is missing', async () => {
		await catchError(() =>
			makeHook().handleBefore(
				makeCtx({ headers: { 'user-agent': 'test-agent' } }),
			),
		);
		expect(mockPendingTermsStore.set).not.toHaveBeenCalled();
	});

	// ── captcha → 422 / 503 ───────────────────────────────────────────────────

	it('throws 503 captcha_api_unavailable when captcha service is unreachable', async () => {
		(mockCaptchaService.verify as ReturnType<typeof vi.fn>).mockResolvedValue({
			success: false,
			unavailable: true,
		} satisfies CaptchaVerifyResult);

		const err = await catchError(() => makeHook().handleBefore(makeCtx()));

		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(503);
		expect((err as APIError).body).toMatchObject({
			error: 'captcha_api_unavailable',
		});
	});

	it('throws 422 captcha_failed when captcha verification fails', async () => {
		(mockCaptchaService.verify as ReturnType<typeof vi.fn>).mockResolvedValue({
			success: false,
		} satisfies CaptchaVerifyResult);

		const err = await catchError(() => makeHook().handleBefore(makeCtx()));

		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
		expect((err as APIError).body).toMatchObject({ error: 'captcha_failed' });
	});

	it('does not call pendingTermsStore.set when captcha fails', async () => {
		(mockCaptchaService.verify as ReturnType<typeof vi.fn>).mockResolvedValue({
			success: false,
		} satisfies CaptchaVerifyResult);

		await catchError(() => makeHook().handleBefore(makeCtx()));
		expect(mockPendingTermsStore.set).not.toHaveBeenCalled();
	});

	it('passes captchaVersion v2 to captcha service when body specifies v2', async () => {
		const body = {
			...VALID_BODY,
			additionalData: { ...VALID_BODY.additionalData, captchaVersion: 'v2' },
		};
		await makeHook().handleBefore(makeCtx({ body }));
		expect(mockCaptchaService.verify).toHaveBeenCalledWith('tok-abc', 'v2');
	});

	it('defaults captchaVersion to v3 when not supplied in body', async () => {
		const { captchaVersion: _omit, ...additionalData } =
			VALID_BODY.additionalData;
		await makeHook().handleBefore(
			makeCtx({ body: { ...VALID_BODY, additionalData } }),
		);
		expect(mockCaptchaService.verify).toHaveBeenCalledWith('tok-abc', 'v3');
	});

	// ── terms version → 422 / 503 ────────────────────────────────────────────

	it('throws 503 terms_version_unavailable when terms repository throws', async () => {
		(
			mockTermsRepository.findActiveBySystemId as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error('DB unavailable'));

		const err = await catchError(() => makeHook().handleBefore(makeCtx()));

		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(503);
		expect((err as APIError).body).toMatchObject({
			error: 'terms_version_unavailable',
		});
	});

	it('throws 422 terms_version_mismatch when submitted UUID does not match active terms', async () => {
		(
			mockTermsRepository.findActiveBySystemId as ReturnType<typeof vi.fn>
		).mockResolvedValue({
			...VALID_TERMS_RECORD,
			id: 'bbbbbbbb-bbbb-4bbb-bbbb-bbbbbbbbbbbb',
		});

		const err = await catchError(() => makeHook().handleBefore(makeCtx()));

		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
		expect((err as APIError).body).toMatchObject({
			error: 'terms_version_mismatch',
		});
	});

	it('throws 422 terms_version_mismatch when no active terms exist', async () => {
		(
			mockTermsRepository.findActiveBySystemId as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		const err = await catchError(() => makeHook().handleBefore(makeCtx()));

		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
		expect((err as APIError).body).toMatchObject({
			error: 'terms_version_mismatch',
		});
	});

	it('throws 422 terms_version_mismatch when systemTermsId is missing from additionalData', async () => {
		const { systemTermsId: _omit, ...additionalData } =
			VALID_BODY.additionalData;
		const err = await catchError(() =>
			makeHook().handleBefore(
				makeCtx({ body: { ...VALID_BODY, additionalData } }),
			),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
		expect((err as APIError).body).toMatchObject({
			error: 'terms_version_mismatch',
		});
	});

	it('does not call pendingTermsStore.set when terms version mismatches', async () => {
		(
			mockTermsRepository.findActiveBySystemId as ReturnType<typeof vi.fn>
		).mockResolvedValue(null);

		await catchError(() => makeHook().handleBefore(makeCtx()));
		expect(mockPendingTermsStore.set).not.toHaveBeenCalled();
	});

	// ── happy path ────────────────────────────────────────────────────────────

	it('resolves without error for a fully valid social sign-in request', async () => {
		await expect(makeHook().handleBefore(makeCtx())).resolves.toBeUndefined();
	});

	it('stores system context in oauthSystemCtxStore on success', async () => {
		await makeHook().handleBefore(makeCtx());
		expect(mockOAuthSystemCtxStore.set).toHaveBeenCalledOnce();
		expect(mockOAuthSystemCtxStore.set).toHaveBeenCalledWith(
			expect.any(String),
			{
				systemId: VALID_SYSTEM_ID,
				organizationId: 'org-001',
				accessModel: 'open',
				apiBaseUrl: 'https://api.example.com',
			},
		);
	});

	it('uses the same correlationId for pendingTermsStore and oauthSystemCtxStore', async () => {
		await makeHook().handleBefore(makeCtx());
		const termsCorrelationId = (
			mockPendingTermsStore.set as ReturnType<typeof vi.fn>
		).mock.calls[0][0] as string;
		const ctxCorrelationId = (
			mockOAuthSystemCtxStore.set as ReturnType<typeof vi.fn>
		).mock.calls[0][0] as string;
		expect(termsCorrelationId).toBe(ctxCorrelationId);
	});

	it('calls pendingTermsStore.set exactly once on the happy path', async () => {
		await makeHook().handleBefore(makeCtx());
		expect(mockPendingTermsStore.set).toHaveBeenCalledTimes(1);
	});

	it('calls pendingTermsStore.set with provider google', async () => {
		await makeHook().handleBefore(makeCtx());
		expect(mockPendingTermsStore.set).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ provider: 'google' }),
		);
	});

	it('calls pendingTermsStore.set with provider facebook when provider is facebook', async () => {
		const body = { ...VALID_BODY, provider: 'facebook' };
		await makeHook().handleBefore(makeCtx({ body }));
		expect(mockPendingTermsStore.set).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ provider: 'facebook' }),
		);
	});

	it('sets additionalData to { correlationId } only after success', async () => {
		const ctx = makeCtx();
		await makeHook().handleBefore(ctx);
		const additionalData = (ctx.body as Record<string, unknown>).additionalData;
		expect(typeof additionalData).toBe('object');
		const keys = Object.keys(additionalData as object);
		expect(keys).toEqual(['correlationId']);
	});

	it('strips captchaToken from additionalData after success', async () => {
		const ctx = makeCtx();
		await makeHook().handleBefore(ctx);
		const additionalData = (ctx.body as Record<string, unknown>)
			.additionalData as Record<string, unknown>;
		expect(additionalData.captchaToken).toBeUndefined();
	});

	it('strips systemTermsId from additionalData after success', async () => {
		const ctx = makeCtx();
		await makeHook().handleBefore(ctx);
		const additionalData = (ctx.body as Record<string, unknown>)
			.additionalData as Record<string, unknown>;
		expect(additionalData.systemTermsId).toBeUndefined();
	});

	it('sets correlationId in additionalData as a valid UUID v4', async () => {
		const ctx = makeCtx();
		await makeHook().handleBefore(ctx);
		const additionalData = (ctx.body as Record<string, unknown>)
			.additionalData as Record<string, unknown>;
		expect(typeof additionalData.correlationId).toBe('string');
		expect(additionalData.correlationId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
	});

	it('emits social_auth_started telemetry with provider label on success', async () => {
		await makeHook().handleBefore(makeCtx());
		expect(recordAuthEvent).toHaveBeenCalledWith('social_auth_started', {
			provider: 'google',
		});
	});

	it('calls logSocialAuthEvent with social_signup_attempt on success', async () => {
		await makeHook().handleBefore(makeCtx());
		// Fire-and-forget — allow microtask to settle
		await Promise.resolve();
		expect(mockAuditLogService.logSocialAuthEvent).toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'social_signup_attempt' }),
		);
	});

	it('uses the same correlationId in pendingTermsStore.set and additionalData', async () => {
		const ctx = makeCtx();
		await makeHook().handleBefore(ctx);
		const storedCorrelationId = (
			mockPendingTermsStore.set as ReturnType<typeof vi.fn>
		).mock.calls[0][0] as string;
		const bodyCorrelationId = (
			(ctx.body as Record<string, unknown>).additionalData as Record<
				string,
				unknown
			>
		).correlationId;
		expect(storedCorrelationId).toBe(bodyCorrelationId);
	});
});
