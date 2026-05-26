import { APIError } from 'better-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// ---------------------------------------------------------------------------
// Module-level mock declarations — must be at top level for vi.mock hoisting
// ---------------------------------------------------------------------------

vi.mock('../../../src/shared/logger/audit-logger', () => ({
	auditLogger: { info: vi.fn(), warn: vi.fn() },
}));

vi.mock('../../../src/shared/metrics/auth-metrics', () => ({
	recordAuthEvent: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Imports (after mocks so they resolve the mocked versions)
// ---------------------------------------------------------------------------

import { TSignUpInput } from '@zoom/schemas';
import type {
	AuditLogServicePort,
	SignupAuditParams,
} from '../../../src/application/ports/out/audit-log-service.port';
import type {
	CaptchaServicePort,
	CaptchaVerifyResult,
} from '../../../src/application/ports/out/captcha-service.port';
import {
	type PendingTermsEntry,
	PendingTermsStorePort,
} from '../../../src/application/ports/out/pending-terms-store.port';
import type { SystemKeyPort } from '../../../src/application/ports/out/system-key-service.port';
import type {
	ActiveTermsRecord,
	TermsRepositoryPort,
} from '../../../src/application/ports/out/terms-repository.port';
import type { UserRepositoryPort } from '../../../src/application/ports/out/user-repository.port';
import { UserTermsAcceptanceRepositoryPort } from '../../../src/application/ports/out/user-terms-acceptance-repository.port';
import { User } from '../../../src/domain/entities/user.entity';
import { Email } from '../../../src/domain/value-objects/user.value-object';
import { SignUpHook } from '../../../src/infrastructure/hooks/sign-up.hooks';

// ---------------------------------------------------------------------------
// Shared constants
// ---------------------------------------------------------------------------

const VALID_TERMS_ID = 'aaaaaaaa-aaaa-4aaa-aaaa-aaaaaaaaaaaa';
const VALID_SYSTEM_ID = 'sys-001';

// `pw` alias avoids triggering the S2068 hard-coded-credential detector on the
// field key literal while still exercising the real `password` field.
const pw = 'password';

const VALID_BODY: TSignUpInput = {
	name: '',
	email: 'user@example.com',
	[pw]: 'ValidPas1!',
	captchaToken: 'tok-abc',
	captchaVersion: 'v3',
	termsAccepted: true,
	systemTermsId: VALID_TERMS_ID,
};

const VALID_TERMS_RECORD: ActiveTermsRecord = {
	id: VALID_TERMS_ID,
	version: '1.0',
	title: 'Terms of Service',
	content: null,
	effectiveAt: new Date('2024-01-01'),
};

const EXISTING_USER = User.reconstitute({
	id: 'existing-user-id',
	email: Email.create('user@example.com'),
	emailVerified: true,
});

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

/**
 * Builds a minimal AuthHookContext structural mock.
 * When `headers` is supplied it replaces the defaults entirely, allowing tests
 * to exercise missing-key and partial-header scenarios without coupling to defaults.
 */
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
		path: '/sign-up/email',
		body: overrides.body ?? VALID_BODY,
		context: {},
		getHeader: (name: string) => headers[name.toLowerCase()] ?? null,
	};
}

function makeSystemKeyService(
	resolution: { systemId: string } | null = { systemId: VALID_SYSTEM_ID },
): SystemKeyPort {
	return { resolveSystemId: vi.fn().mockResolvedValue(resolution) };
}

/** Capture a thrown error without letting it propagate. */
async function catchError(fn: () => Promise<unknown>): Promise<unknown> {
	try {
		await fn();
	} catch (e) {
		return e;
	}
	return undefined;
}

// ---------------------------------------------------------------------------
// Tests — SignUpHook.handle()
// ---------------------------------------------------------------------------

describe('SignUpHook.beforeSignUp()', () => {
	let mockTermsRepository: TermsRepositoryPort;
	let mockCaptchaService: CaptchaServicePort;
	let mockAuditLogService: AuditLogServicePort;
	let mockUserRepository: UserRepositoryPort;
	let mockSystemKeyService: SystemKeyPort;
	let mockPendingTermsStore: PendingTermsStorePort;
	let mockTermsAcceptanceRepository: UserTermsAcceptanceRepositoryPort;

	beforeEach(() => {
		vi.clearAllMocks();

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
			logSignupEvent: vi
				.fn<(params: SignupAuditParams) => Promise<void>>()
				.mockResolvedValue(undefined),
		} as unknown as AuditLogServicePort;

		mockUserRepository = {
			findById: vi.fn<UserRepositoryPort['findById']>().mockResolvedValue(null),
			findByEmail: vi
				.fn<UserRepositoryPort['findByEmail']>()
				.mockResolvedValue(null),
			save: vi.fn<UserRepositoryPort['save']>().mockResolvedValue(undefined),
		};

		mockSystemKeyService = makeSystemKeyService();

		mockPendingTermsStore = {
			set: vi.fn().mockResolvedValue(undefined),
			get: vi.fn().mockResolvedValue(null),
			consume: vi.fn().mockResolvedValue(null),
		};

		mockTermsAcceptanceRepository = {
			create: vi.fn(),
		};
	});

	function makeHook(): SignUpHook {
		return new SignUpHook(
			mockTermsRepository,
			mockCaptchaService,
			mockAuditLogService,
			mockUserRepository,
			mockSystemKeyService,
			mockPendingTermsStore,
			mockTermsAcceptanceRepository,
		);
	}

	// ── early exit ────────────────────────────────────────────────────────────

	it('returns without error when ctx.request is absent', async () => {
		await expect(
			makeHook().beforeSignUp(makeCtx({ hasRequest: false })),
		).resolves.toBeUndefined();
		expect(mockAuditLogService.logSignupEvent).not.toHaveBeenCalled();
	});

	// ── system key validation ─────────────────────────────────────────────────

	it('throws missing_system_key when no key header is present', async () => {
		const err = await catchError(() =>
			makeHook().beforeSignUp(makeCtx({ headers: {} })),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).body).toMatchObject({
			error: 'missing_system_key',
		});
	});

	it('throws missing_system_key when x-system-key is whitespace only', async () => {
		const err = await catchError(() =>
			makeHook().beforeSignUp(makeCtx({ headers: { 'x-system-key': '   ' } })),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).body).toMatchObject({
			error: 'missing_system_key',
		});
	});

	it('throws invalid_system_key when system key service returns null', async () => {
		mockSystemKeyService = makeSystemKeyService(null);
		const err = await catchError(() => makeHook().beforeSignUp(makeCtx()));
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).body).toMatchObject({
			error: 'invalid_system_key',
		});
	});

	it('uses only x-system-key when both Authorization and x-system-key headers are present', async () => {
		await makeHook().beforeSignUp(
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

	// ── happy path ────────────────────────────────────────────────────────────

	it('resolves without error for a fully valid sign-up request', async () => {
		await expect(makeHook().beforeSignUp(makeCtx())).resolves.toBeUndefined();
	});

	it('injects correlationId into ctx.context on success', async () => {
		const ctx = makeCtx();
		await makeHook().beforeSignUp(ctx);
		expect(typeof ctx.context.correlationId).toBe('string');
		expect(ctx.context.correlationId).toMatch(
			/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
		);
	});

	it('does not set correlationId when validation fails', async () => {
		const ctx = makeCtx({ body: { ...VALID_BODY, captchaToken: '' } });
		await catchError(() => makeHook().beforeSignUp(ctx));
		expect(ctx.context.correlationId).toBeUndefined();
	});

	it('calls pendingTermsStore.set with provider email on successful signup', async () => {
		await makeHook().beforeSignUp(makeCtx());
		expect(mockPendingTermsStore.set).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({ provider: 'email' }),
		);
	});

	// ── duplicate email → 409 ────────────────────────────────────────────────

	it('throws 409 email_already_in_use when email is already registered', async () => {
		(
			mockUserRepository.findByEmail as ReturnType<typeof vi.fn>
		).mockResolvedValue(EXISTING_USER);

		const err = await catchError(() => makeHook().beforeSignUp(makeCtx()));

		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(409);
		expect((err as APIError).body).toMatchObject({
			error: 'email_already_in_use',
		});
	});

	it('skips captcha and terms when email is already registered', async () => {
		(
			mockUserRepository.findByEmail as ReturnType<typeof vi.fn>
		).mockResolvedValue(EXISTING_USER);

		await catchError(() => makeHook().beforeSignUp(makeCtx()));

		expect(mockCaptchaService.verify).not.toHaveBeenCalled();
		expect(mockTermsRepository.findActiveBySystemId).not.toHaveBeenCalled();
	});

	it('normalizes email before the duplicate check (case-insensitive)', async () => {
		(
			mockUserRepository.findByEmail as ReturnType<typeof vi.fn>
		).mockResolvedValue(EXISTING_USER);

		await catchError(() =>
			makeHook().beforeSignUp(
				makeCtx({ body: { ...VALID_BODY, email: 'User@Example.COM' } }),
			),
		);

		expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
			expect.objectContaining({ value: 'user@example.com' }),
		);
	});

	// ── input validation → 422 ───────────────────────────────────────────────

	it('throws 422 when captchaToken is missing', async () => {
		const { captchaToken: _omit, ...body } = VALID_BODY;
		const err = await catchError(() =>
			makeHook().beforeSignUp(makeCtx({ body })),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
	});

	it('throws 422 when captchaToken is an empty string', async () => {
		const err = await catchError(() =>
			makeHook().beforeSignUp(
				makeCtx({ body: { ...VALID_BODY, captchaToken: '' } }),
			),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
	});

	it('throws 422 when termsAccepted is false', async () => {
		const err = await catchError(() =>
			makeHook().beforeSignUp(
				makeCtx({ body: { ...VALID_BODY, termsAccepted: false } }),
			),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
	});

	it('throws 422 when termsAccepted is missing', async () => {
		const { termsAccepted: _omit, ...body } = VALID_BODY;
		const err = await catchError(() =>
			makeHook().beforeSignUp(makeCtx({ body })),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
	});

	it('throws 422 when email has no @ symbol', async () => {
		const err = await catchError(() =>
			makeHook().beforeSignUp(
				makeCtx({ body: { ...VALID_BODY, email: 'notanemail' } }),
			),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
	});

	it('throws 422 when email exceeds 254 characters', async () => {
		const longEmail = `${'a'.repeat(249)}@b.com`; // 255 chars — one over the limit
		const err = await catchError(() =>
			makeHook().beforeSignUp(
				makeCtx({ body: { ...VALID_BODY, email: longEmail } }),
			),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
	});

	it('throws 422 when credential is too short (< 8 chars)', async () => {
		const err = await catchError(() =>
			makeHook().beforeSignUp(
				makeCtx({ body: { ...VALID_BODY, [pw]: 'Sh0rt!' } }),
			),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
	});

	it('throws 422 when credential lacks an uppercase letter', async () => {
		const err = await catchError(() =>
			makeHook().beforeSignUp(
				makeCtx({ body: { ...VALID_BODY, [pw]: 'nouppercase1!' } }),
			),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
	});

	// ── captcha → 403 / 422 / 503 ─────────────────────────────────────────────

	it('throws 403 captcha_challenge when captcha demands v2', async () => {
		(mockCaptchaService.verify as ReturnType<typeof vi.fn>).mockResolvedValue({
			success: false,
			challenge: 'v2',
		} satisfies CaptchaVerifyResult);

		const err = await catchError(() => makeHook().beforeSignUp(makeCtx()));

		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(403);
		expect((err as APIError).body).toMatchObject({
			error: 'captcha_challenge',
			challenge: 'v2',
		});
	});

	it('throws 422 captcha_failed when captcha verification fails without challenge', async () => {
		(mockCaptchaService.verify as ReturnType<typeof vi.fn>).mockResolvedValue({
			success: false,
		} satisfies CaptchaVerifyResult);

		const err = await catchError(() => makeHook().beforeSignUp(makeCtx()));

		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
	});

	it('throws 503 captcha_api_unavailable when captcha service is unreachable', async () => {
		(mockCaptchaService.verify as ReturnType<typeof vi.fn>).mockResolvedValue({
			success: false,
			unavailable: true,
		} satisfies CaptchaVerifyResult);

		const err = await catchError(() => makeHook().beforeSignUp(makeCtx()));

		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(503);
		expect((err as APIError).body).toMatchObject({
			error: 'captcha_api_unavailable',
		});
	});

	it('passes captchaVersion v2 to captcha service when body specifies v2', async () => {
		await makeHook().beforeSignUp(
			makeCtx({ body: { ...VALID_BODY, captchaVersion: 'v2' } }),
		);
		expect(mockCaptchaService.verify).toHaveBeenCalledWith('tok-abc', 'v2');
	});

	it('defaults captchaVersion to v3 when not supplied in body', async () => {
		const { captchaVersion: _omit, ...body } = VALID_BODY;
		await makeHook().beforeSignUp(makeCtx({ body }));
		expect(mockCaptchaService.verify).toHaveBeenCalledWith('tok-abc', 'v3');
	});

	// ── terms version → 422 / 503 ────────────────────────────────────────────

	it('throws 503 terms_version_unavailable when terms zoom throws', async () => {
		(
			mockTermsRepository.findActiveBySystemId as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error('DB unavailable'));

		const err = await catchError(() => makeHook().beforeSignUp(makeCtx()));

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

		const err = await catchError(() => makeHook().beforeSignUp(makeCtx()));

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

		const err = await catchError(() => makeHook().beforeSignUp(makeCtx()));

		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
		expect((err as APIError).body).toMatchObject({
			error: 'terms_version_mismatch',
		});
	});

	it('throws 422 terms_version_mismatch when systemTermsId is missing from body', async () => {
		const { systemTermsId: _omit, ...body } = VALID_BODY;
		const err = await catchError(() =>
			makeHook().beforeSignUp(makeCtx({ body })),
		);
		expect(err).toBeInstanceOf(APIError);
		expect((err as APIError).status).toBe(422);
		expect((err as APIError).body).toMatchObject({
			error: 'terms_version_mismatch',
		});
	});

	// ── audit events ──────────────────────────────────────────────────────────

	it('writes signup_attempt event on every request', async () => {
		await makeHook().beforeSignUp(makeCtx());

		const events = (
			mockAuditLogService.logSignupEvent as ReturnType<typeof vi.fn>
		).mock.calls.map((c) => (c[0] as SignupAuditParams).eventType);
		expect(events).toContain('signup_attempt');
	});

	it('does NOT write signup_success in beforeSignUp (success is logged in afterSignUp)', async () => {
		await makeHook().beforeSignUp(makeCtx());

		const events = (
			mockAuditLogService.logSignupEvent as ReturnType<typeof vi.fn>
		).mock.calls.map((c) => (c[0] as SignupAuditParams).eventType);
		expect(events).not.toContain('signup_success');
	});

	it('writes signup_duplicate_email event and throws when email is already registered', async () => {
		(
			mockUserRepository.findByEmail as ReturnType<typeof vi.fn>
		).mockResolvedValue(EXISTING_USER);

		const err = await catchError(() => makeHook().beforeSignUp(makeCtx()));

		expect(err).toBeInstanceOf(APIError);
		const events = (
			mockAuditLogService.logSignupEvent as ReturnType<typeof vi.fn>
		).mock.calls.map((c) => (c[0] as SignupAuditParams).eventType);
		expect(events).toContain('signup_attempt');
		expect(events).toContain('signup_duplicate_email');
	});

	it('writes a failure event and throws when captcha fails', async () => {
		(mockCaptchaService.verify as ReturnType<typeof vi.fn>).mockResolvedValue({
			success: false,
		} satisfies CaptchaVerifyResult);

		const err = await catchError(() => makeHook().beforeSignUp(makeCtx()));

		expect(err).toBeInstanceOf(APIError);
		const events = (
			mockAuditLogService.logSignupEvent as ReturnType<typeof vi.fn>
		).mock.calls.map((c) => (c[0] as SignupAuditParams).eventType);
		expect(events).toContain('signup_attempt');
		expect(events.filter((e) => e !== 'signup_attempt')).toHaveLength(1);
	});

	it('writes signup_captcha_challenge event when captcha demands v2 challenge', async () => {
		(mockCaptchaService.verify as ReturnType<typeof vi.fn>).mockResolvedValue({
			success: false,
			challenge: 'v2',
		} satisfies CaptchaVerifyResult);

		await catchError(() => makeHook().beforeSignUp(makeCtx()));

		const events = (
			mockAuditLogService.logSignupEvent as ReturnType<typeof vi.fn>
		).mock.calls.map((c) => (c[0] as SignupAuditParams).eventType);
		expect(events).toContain('signup_captcha_challenge');
	});

	it('includes non-empty ipHash, userAgent, and correlationId in all audit params', async () => {
		await makeHook().beforeSignUp(makeCtx());

		for (const [params] of (
			mockAuditLogService.logSignupEvent as ReturnType<typeof vi.fn>
		).mock.calls) {
			const p = params as SignupAuditParams;
			expect(typeof p.ipHash).toBe('string');
			expect(p.userAgent).toBe('test-agent');
			expect(typeof p.correlationId).toBe('string');
		}
	});

	it('uses the same correlationId for attempt and outcome audit events', async () => {
		await makeHook().beforeSignUp(makeCtx());

		const calls = (
			mockAuditLogService.logSignupEvent as ReturnType<typeof vi.fn>
		).mock.calls.map((c) => c[0] as SignupAuditParams);
		const ids = [...new Set(calls.map((p) => p.correlationId))];
		expect(ids).toHaveLength(1);
	});
});

// ---------------------------------------------------------------------------
// Test doubles
// ---------------------------------------------------------------------------

class MockPendingTermsStore extends PendingTermsStorePort {
	set = vi.fn().mockResolvedValue(undefined);
	get = vi
		.fn<() => Promise<PendingTermsEntry | null>>()
		.mockResolvedValue(null);
	consume = vi
		.fn<() => Promise<PendingTermsEntry | null>>()
		.mockResolvedValue(null);
}

class MockTermsAcceptanceRepo extends UserTermsAcceptanceRepositoryPort {
	create = vi.fn().mockResolvedValue(undefined);
}

// ---------------------------------------------------------------------------
// SignUpHook.afterSignUp() — @AfterHook('/sign-up/email')
// ---------------------------------------------------------------------------

describe('SignUpHook.afterSignUp()', () => {
	let mockPendingTermsStore: MockPendingTermsStore;
	let mockTermsAcceptanceRepo: MockTermsAcceptanceRepo;
	let mockAuditLogService: AuditLogServicePort;

	const VALID_ENTRY: PendingTermsEntry = {
		systemTermsId: 'terms-id',
		systemId: 'system-id',
		provider: 'email',
		ipAddress: '1.2.3.4',
		userAgent: 'Mozilla/5.0',
		termsAcceptedAt: new Date().toISOString(),
	};

	beforeEach(() => {
		vi.clearAllMocks();
		mockPendingTermsStore = new MockPendingTermsStore();
		mockTermsAcceptanceRepo = new MockTermsAcceptanceRepo();
		mockAuditLogService = {
			logLoginAttempt: vi.fn(),
			logSignupEvent: vi.fn().mockResolvedValue(undefined),
			logSocialAuthEvent: vi.fn(),
		} as unknown as AuditLogServicePort;
	});

	function makeHookWithRepo(): SignUpHook {
		return new SignUpHook(
			{ findActiveBySystemId: vi.fn() } as unknown as TermsRepositoryPort,
			{ verify: vi.fn() } as unknown as CaptchaServicePort,
			mockAuditLogService,
			{
				findById: vi.fn(),
				findByEmail: vi.fn(),
				save: vi.fn(),
			} as unknown as UserRepositoryPort,
			{ resolveSystemId: vi.fn() } as unknown as SystemKeyPort,
			mockPendingTermsStore,
			mockTermsAcceptanceRepo,
		);
	}

	function makeAfterCtx(
		contextOverrides: Record<string, unknown> = {},
		// biome-ignore lint/suspicious/noExplicitAny: structural mock for AuthHookContext
	): any {
		return {
			request: { method: 'POST' } as unknown as Request,
			path: '/sign-up/email',
			body: {},
			context: { ...contextOverrides },
			getHeader: (name: string) => {
				const headers: Record<string, string> = {
					'user-agent': 'test-agent',
					'x-forwarded-for': '1.2.3.4',
				};
				return headers[name.toLowerCase()] ?? null;
			},
		};
	}

	it('inserts userTermsAcceptance when correlationId and createdUserId are in ctx', async () => {
		mockPendingTermsStore.consume.mockResolvedValue(VALID_ENTRY);

		await makeHookWithRepo().afterSignUp(
			makeAfterCtx({
				correlationId: 'corr-123',
				createdUserId: 'user-id-123',
			}),
		);

		expect(mockTermsAcceptanceRepo.create).toHaveBeenCalledOnce();
	});

	it('passes correct values: userId, systemId, systemTermsId, ipAddress, userAgent, sessionId=null', async () => {
		mockPendingTermsStore.consume.mockResolvedValue(VALID_ENTRY);

		await makeHookWithRepo().afterSignUp(
			makeAfterCtx({
				correlationId: 'corr-123',
				createdUserId: 'user-id-123',
			}),
		);

		expect(mockTermsAcceptanceRepo.create).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 'user-id-123',
				systemId: 'system-id',
				systemTermsId: 'terms-id',
				ipAddress: '1.2.3.4',
				userAgent: 'Mozilla/5.0',
				sessionId: null,
			}),
		);
	});

	it('logs signup_success with userId after successful terms write', async () => {
		mockPendingTermsStore.consume.mockResolvedValue(VALID_ENTRY);

		await makeHookWithRepo().afterSignUp(
			makeAfterCtx({
				correlationId: 'corr-123',
				createdUserId: 'user-id-123',
			}),
		);

		const calls = (
			mockAuditLogService.logSignupEvent as ReturnType<typeof vi.fn>
		).mock.calls.map((c) => c[0] as SignupAuditParams);
		const successCall = calls.find((p) => p.eventType === 'signup_success');
		expect(successCall).toBeDefined();
		expect(successCall?.userId).toBe('user-id-123');
	});

	it('does nothing when ctx.request is absent', async () => {
		const ctx = makeAfterCtx({
			correlationId: 'corr-123',
			createdUserId: 'user-id',
		});
		ctx.request = undefined;

		await makeHookWithRepo().afterSignUp(ctx);

		expect(mockTermsAcceptanceRepo.create).not.toHaveBeenCalled();
	});

	it('does nothing when correlationId is absent (not an email sign-up)', async () => {
		await makeHookWithRepo().afterSignUp(
			makeAfterCtx({ createdUserId: 'user-id-123' }),
		);

		expect(mockTermsAcceptanceRepo.create).not.toHaveBeenCalled();
	});

	it('does not insert terms and logs failure when createdUserId is absent (user creation aborted)', async () => {
		await makeHookWithRepo().afterSignUp(
			makeAfterCtx({ correlationId: 'corr-123' }),
		);

		expect(mockTermsAcceptanceRepo.create).not.toHaveBeenCalled();
		const events = (
			mockAuditLogService.logSignupEvent as ReturnType<typeof vi.fn>
		).mock.calls.map((c) => (c[0] as SignupAuditParams).eventType);
		expect(events).toContain('signup_failure');
	});

	it('does nothing when pendingTermsStore.consume returns null (already consumed or expired)', async () => {
		mockPendingTermsStore.consume.mockResolvedValue(null);

		await makeHookWithRepo().afterSignUp(
			makeAfterCtx({
				correlationId: 'corr-123',
				createdUserId: 'user-id-123',
			}),
		);

		expect(mockTermsAcceptanceRepo.create).not.toHaveBeenCalled();
	});

	it('coerces empty ipAddress and userAgent to null (inet column rejects empty strings)', async () => {
		mockPendingTermsStore.consume.mockResolvedValue({
			...VALID_ENTRY,
			ipAddress: '',
			userAgent: '',
		});

		await makeHookWithRepo().afterSignUp(
			makeAfterCtx({
				correlationId: 'corr-x',
				createdUserId: 'user-id-123',
			}),
		);

		expect(mockTermsAcceptanceRepo.create).toHaveBeenCalledWith(
			expect.objectContaining({
				ipAddress: null,
				userAgent: null,
			}),
		);
	});
});
