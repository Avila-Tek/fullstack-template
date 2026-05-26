import { APIError } from 'better-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/shared/logger/audit-logger', () => ({
	auditLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../src/shared/metrics/auth-metrics', () => ({
	recordAuthEvent: vi.fn(),
}));

vi.mock('../../../src/infrastructure/better-auth/auth', () => ({
	auth: { api: { getSession: vi.fn() } },
}));

vi.mock('../../../src/env', () => ({
	env: { VERIFICATION_TOKEN_TTL_HOURS: 24 },
}));

import type { AccountRepositoryPort } from '../../../src/application/ports/out/account-repository.port';
import type { ChangeEmailAuditLogPort } from '../../../src/application/ports/out/change-email-audit-log.port';
import type { ChangeEmailPendingPort } from '../../../src/application/ports/out/change-email-pending.port';
import type { PasswordHashServicePort } from '../../../src/application/ports/out/password-hash-service.port';
import type { UserRepositoryPort } from '../../../src/application/ports/out/user-repository.port';
import { auth } from '../../../src/infrastructure/better-auth/auth';
import { ChangeEmailHook } from '../../../src/infrastructure/hooks/change-email.hook';
import { auditLogger } from '../../../src/shared/logger/audit-logger';
import { recordAuthEvent } from '../../../src/shared/metrics/auth-metrics';

const USER_ID = 'aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee';
const OLD_EMAIL = 'old@example.com';
const OLD_NORMALIZED = 'old@example.com';
const NEW_EMAIL = 'new@example.com';
const STORED_HASH = '$argon2id$stored-hash';

function makeCtx(
	overrides: {
		body?: object;
		hasRequest?: boolean;
		context?: Record<string, unknown>;
	} = {},
	// biome-ignore lint/suspicious/noExplicitAny: structural mock
): any {
	const headers: Record<string, string> = {
		'user-agent': 'test-agent',
		'x-forwarded-for': '1.2.3.4',
	};
	return {
		request:
			overrides.hasRequest === false
				? undefined
				: ({ method: 'POST' } as unknown as Request),
		path: '/change-email',
		body: overrides.body ?? {
			currentPassword: 'Current1!Pass',
			newEmail: NEW_EMAIL,
		},
		context: overrides.context ?? {},
		json: vi.fn().mockReturnValue({ status: true }),
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

describe('ChangeEmailHook', () => {
	let accountRepo: AccountRepositoryPort;
	let userRepo: UserRepositoryPort;
	let hashService: PasswordHashServicePort;
	let pendingPort: ChangeEmailPendingPort;
	let auditLog: ChangeEmailAuditLogPort;

	beforeEach(() => {
		vi.clearAllMocks();

		accountRepo = {
			findCredentialAccount: vi
				.fn()
				.mockResolvedValue({ id: 'acc-1', passwordHash: STORED_HASH }),
			updatePassword: vi.fn(),
			unlinkSocialAccountsExcept: vi.fn(),
			createCredential: vi.fn(),
			deleteCredential: vi.fn(),
		};

		userRepo = {
			findById: vi.fn(),
			findByEmail: vi.fn(),
			findByNormalizedEmail: vi.fn().mockResolvedValue(null),
			save: vi.fn(),
			updateSessionInvalidBefore: vi.fn(),
			updateTwoFactorEnabled: vi.fn(),
			createProvisioned: vi.fn(),
			markEmailVerified: vi.fn(),
		};

		hashService = {
			hash: vi.fn(),
			verify: vi.fn().mockResolvedValue(true),
		};

		pendingPort = {
			set: vi.fn().mockResolvedValue(undefined),
			get: vi.fn(),
			delete: vi.fn(),
		};

		auditLog = { log: vi.fn().mockResolvedValue(undefined) };

		(auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
			user: {
				id: USER_ID,
				email: OLD_EMAIL,
				normalizedEmail: OLD_NORMALIZED,
			},
			session: { id: 'sess-1' },
		});
	});

	function makeHook(): ChangeEmailHook {
		return new ChangeEmailHook(
			accountRepo,
			userRepo,
			hashService,
			pendingPort,
			auditLog,
		);
	}

	describe('before()', () => {
		it('returns early when no request', async () => {
			const ctx = makeCtx({ hasRequest: false });
			await expect(makeHook().before(ctx)).resolves.toBeUndefined();
			expect(auth.api.getSession).not.toHaveBeenCalled();
		});

		it('throws 401 when no session', async () => {
			(auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue(null);

			const err = await catchError(() => makeHook().before(makeCtx()));

			expect(err).toBeInstanceOf(APIError);
			expect((err as APIError).status).toBe(401);
			expect((err as APIError).body).toMatchObject({ error: 'unauthorized' });
		});

		it('throws 422 on invalid body (missing fields)', async () => {
			const err = await catchError(() =>
				makeHook().before(makeCtx({ body: { newEmail: NEW_EMAIL } })),
			);

			expect(err).toBeInstanceOf(APIError);
			expect((err as APIError).status).toBe(422);
			expect((err as APIError).body).toMatchObject({ error: 'invalid_input' });
		});

		it('throws 422 when new email equals current (same_email)', async () => {
			const err = await catchError(() =>
				makeHook().before(
					makeCtx({
						body: { currentPassword: 'Current1!Pass', newEmail: OLD_EMAIL },
					}),
				),
			);

			expect(err).toBeInstanceOf(APIError);
			expect((err as APIError).status).toBe(422);
			expect((err as APIError).body).toMatchObject({ error: 'same_email' });
			expect(accountRepo.findCredentialAccount).not.toHaveBeenCalled();
		});

		it('throws 422 when no credential account (social-only user)', async () => {
			(
				accountRepo.findCredentialAccount as ReturnType<typeof vi.fn>
			).mockResolvedValue(null);

			const err = await catchError(() => makeHook().before(makeCtx()));

			expect(err).toBeInstanceOf(APIError);
			expect((err as APIError).status).toBe(422);
			expect((err as APIError).body).toMatchObject({
				error: 'no_password_account',
			});
			expect(recordAuthEvent).toHaveBeenCalledWith(
				'email_change_no_password_account',
			);
			expect(userRepo.findByNormalizedEmail).not.toHaveBeenCalled();
		});

		it('throws 422 when credential account has null passwordHash', async () => {
			(
				accountRepo.findCredentialAccount as ReturnType<typeof vi.fn>
			).mockResolvedValue({ id: 'acc-1', passwordHash: null });

			const err = await catchError(() => makeHook().before(makeCtx()));

			expect(err).toBeInstanceOf(APIError);
			expect((err as APIError).status).toBe(422);
			expect((err as APIError).body).toMatchObject({
				error: 'no_password_account',
			});
		});

		it('throws 400 when wrong currentPassword; collision check NOT called', async () => {
			(hashService.verify as ReturnType<typeof vi.fn>).mockResolvedValue(false);

			const err = await catchError(() => makeHook().before(makeCtx()));

			expect(err).toBeInstanceOf(APIError);
			expect((err as APIError).status).toBe(400);
			expect((err as APIError).body).toMatchObject({
				error: 'invalid_credentials',
			});
			expect(recordAuthEvent).toHaveBeenCalledWith(
				'email_change_invalid_credentials',
			);
			expect(userRepo.findByNormalizedEmail).not.toHaveBeenCalled();
		});

		it('returns silent success on normalizedEmail collision (other user); pendingPort untouched', async () => {
			(
				userRepo.findByNormalizedEmail as ReturnType<typeof vi.fn>
			).mockResolvedValue({ id: 'other-user-id' });

			const ctx = makeCtx();
			const result = await makeHook().before(ctx);

			expect(ctx.json).toHaveBeenCalledWith({ status: true });
			expect(result).toBeDefined();
			expect(recordAuthEvent).toHaveBeenCalledWith(
				'email_change_collision_silent',
			);
			expect(pendingPort.set).not.toHaveBeenCalled();
			expect(ctx.context.changeEmailCtx).toBeUndefined();
		});

		it('short-circuit return from ctx.json prevents BA from processing (8a)', async () => {
			(
				userRepo.findByNormalizedEmail as ReturnType<typeof vi.fn>
			).mockResolvedValue({ id: 'other-user-id' });
			const jsonReturn = { fakeResponse: true };
			const ctx = makeCtx();
			ctx.json = vi.fn().mockReturnValue(jsonReturn);

			const result = await makeHook().before(ctx);

			expect(result).toBe(jsonReturn);
		});

		it('stashes changeEmailCtx on happy path', async () => {
			const ctx = makeCtx();

			await makeHook().before(ctx);

			expect(ctx.context.changeEmailCtx).toMatchObject({
				userId: USER_ID,
				oldEmail: OLD_EMAIL,
				newEmail: NEW_EMAIL,
			});
			expect(ctx.context.changeEmailCtx).toHaveProperty('correlationId');
			expect(ctx.context.changeEmailCtx).toHaveProperty('normalizedNewEmail');
		});

		it('writes pending record on happy path', async () => {
			const ctx = makeCtx();

			await makeHook().before(ctx);

			expect(pendingPort.set).toHaveBeenCalledWith(
				USER_ID,
				expect.objectContaining({
					newEmail: NEW_EMAIL,
					normalizedNewEmail: NEW_EMAIL,
					oldEmail: OLD_EMAIL,
					createdAt: expect.any(String),
				}),
				expect.any(Number),
			);
		});

		it('TTL passed to pendingPort.set equals VERIFICATION_TOKEN_TTL_HOURS * 3600', async () => {
			await makeHook().before(makeCtx());

			const [, , ttl] = (pendingPort.set as ReturnType<typeof vi.fn>).mock
				.calls[0];
			expect(ttl).toBe(24 * 3600);
		});

		it('throws 503 when pendingPort.set rejects', async () => {
			(pendingPort.set as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('redis down'),
			);

			const err = await catchError(() => makeHook().before(makeCtx()));

			expect(err).toBeInstanceOf(APIError);
			expect((err as APIError).status).toBe(503);
			expect((err as APIError).body).toMatchObject({
				error: 'pending_state_unavailable',
			});
		});

		it('does not emit email_change_initiated when pendingPort.set rejects', async () => {
			(pendingPort.set as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('redis down'),
			);

			await catchError(() => makeHook().before(makeCtx()));

			expect(recordAuthEvent).not.toHaveBeenCalledWith(
				'email_change_initiated',
			);
		});

		it('emits email_change_initiated on happy path', async () => {
			await makeHook().before(makeCtx());

			expect(recordAuthEvent).toHaveBeenCalledWith('email_change_initiated');
		});

		it('call order: findCredentialAccount → verify → findByNormalizedEmail → pendingPort.set', async () => {
			const callOrder: string[] = [];

			(
				accountRepo.findCredentialAccount as ReturnType<typeof vi.fn>
			).mockImplementation(async () => {
				callOrder.push('findCredentialAccount');
				return { id: 'acc-1', passwordHash: STORED_HASH };
			});
			(hashService.verify as ReturnType<typeof vi.fn>).mockImplementation(
				async () => {
					callOrder.push('verify');
					return true;
				},
			);
			(
				userRepo.findByNormalizedEmail as ReturnType<typeof vi.fn>
			).mockImplementation(async () => {
				callOrder.push('findByNormalizedEmail');
				return null;
			});
			(pendingPort.set as ReturnType<typeof vi.fn>).mockImplementation(
				async () => {
					callOrder.push('pendingPort.set');
				},
			);

			await makeHook().before(makeCtx());

			expect(callOrder[0]).toBe('findCredentialAccount');
			expect(callOrder[1]).toBe('verify');
			expect(callOrder[2]).toBe('findByNormalizedEmail');
			expect(callOrder[3]).toBe('pendingPort.set');
		});
	});

	describe('after()', () => {
		const baseCtx = {
			userId: USER_ID,
			oldEmail: OLD_EMAIL,
			newEmail: NEW_EMAIL,
			normalizedNewEmail: NEW_EMAIL,
			correlationId: 'corr-1',
			ipAddress: '1.2.3.4',
			userAgent: 'ua',
			ipHash: 'hash',
		};

		it('returns early when no changeEmailCtx — no audit, no side effects', async () => {
			const ctx = makeCtx({ context: {} });
			await makeHook().after(ctx);
			expect(auditLog.log).not.toHaveBeenCalled();
			expect(pendingPort.set).not.toHaveBeenCalled();
			expect(recordAuthEvent).not.toHaveBeenCalled();
		});

		it('emits email_change_failed on BA error', async () => {
			const ctx = makeCtx({
				context: {
					changeEmailCtx: baseCtx,
					returned: { statusCode: 400, body: { code: 'SOME_ERROR' } },
				},
			});

			await makeHook().after(ctx);

			expect(recordAuthEvent).toHaveBeenCalledWith('email_change_failed');
			expect(pendingPort.set).not.toHaveBeenCalled();
		});

		it('deletes pending record on BA error (rollback)', async () => {
			(pendingPort.delete as ReturnType<typeof vi.fn>).mockResolvedValue(
				undefined,
			);
			const ctx = makeCtx({
				context: {
					changeEmailCtx: baseCtx,
					returned: { statusCode: 400, body: { code: 'SOME_ERROR' } },
				},
			});

			await makeHook().after(ctx);

			expect(pendingPort.delete).toHaveBeenCalledWith(USER_ID);
		});

		it('logs warning but does not throw when pending delete fails during rollback', async () => {
			(pendingPort.delete as ReturnType<typeof vi.fn>).mockRejectedValue(
				new Error('redis unavailable'),
			);
			const ctx = makeCtx({
				context: {
					changeEmailCtx: baseCtx,
					returned: { statusCode: 400, body: { code: 'SOME_ERROR' } },
				},
			});

			await expect(makeHook().after(ctx)).resolves.toBeUndefined();
			expect(pendingPort.delete).toHaveBeenCalledWith(USER_ID);
			expect(auditLogger.warn).toHaveBeenCalled();
			expect(
				(auditLogger.warn as ReturnType<typeof vi.fn>).mock.calls.some(
					(args: unknown[]) =>
						(args[0] as Record<string, unknown>)?.event ===
						'email_change_pending_rollback_failed',
				),
			).toBe(true);
		});

		it('emits email_change_verification_sent on BA success; no pending write', async () => {
			const ctx = makeCtx({
				context: {
					changeEmailCtx: baseCtx,
					returned: { statusCode: 200 },
				},
			});

			await makeHook().after(ctx);

			expect(recordAuthEvent).toHaveBeenCalledWith(
				'email_change_verification_sent',
			);
			expect(pendingPort.set).not.toHaveBeenCalled();
		});
	});
});
