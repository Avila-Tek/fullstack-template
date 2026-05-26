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

import type { AccountRepositoryPort } from '../../../src/application/ports/out/account-repository.port';
import type { ChangePasswordAuditLogPort } from '../../../src/application/ports/out/change-password-audit-log.port';
import type { PasswordHashServicePort } from '../../../src/application/ports/out/password-hash-service.port';
import type { PasswordHistoryRepositoryPort } from '../../../src/application/ports/out/password-history-repository.port';
import { auth } from '../../../src/infrastructure/better-auth/auth';
import { ChangePasswordHook } from '../../../src/infrastructure/hooks/change-password.hook';
import { recordAuthEvent } from '../../../src/shared/metrics/auth-metrics';

const USER_ID = '11111111-2222-4333-8444-555555555555';
const CURRENT_PASSWORD = 'OldSecure1!Pass';
const NEW_PASSWORD = 'NewSecure1!Pass';
const STORED_HASH = '$argon2id$stored-hash';

function makeCtx(
	overrides: {
		body?: object;
		hasRequest?: boolean;
		headers?: Record<string, string>;
		context?: Record<string, unknown>;
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
				: ({ method: 'POST' } as unknown as Request),
		path: '/change-password',
		body: overrides.body ?? {
			currentPassword: CURRENT_PASSWORD,
			newPassword: NEW_PASSWORD,
		},
		context: overrides.context ?? {},
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

describe('ChangePasswordHook', () => {
	let historyRepo: PasswordHistoryRepositoryPort;
	let hashService: PasswordHashServicePort;
	let auditLog: ChangePasswordAuditLogPort;
	let accountRepo: AccountRepositoryPort;

	beforeEach(() => {
		vi.clearAllMocks();
		historyRepo = {
			findRecentHashes: vi.fn().mockResolvedValue([]),
			append: vi.fn(),
		};
		hashService = {
			hash: vi.fn().mockResolvedValue('$argon2id$new-hash'),
			verify: vi.fn().mockResolvedValue(false),
		};
		auditLog = { log: vi.fn().mockResolvedValue(undefined) };
		accountRepo = {
			findCredentialAccount: vi
				.fn()
				.mockResolvedValue({ id: 'acc-1', passwordHash: STORED_HASH }),
			updatePassword: vi.fn(),
			unlinkSocialAccountsExcept: vi.fn(),
			createCredential: vi.fn(),
			deleteCredential: vi.fn(),
		};

		(auth.api.getSession as ReturnType<typeof vi.fn>).mockResolvedValue({
			user: { id: USER_ID },
			session: { id: 'sess-1' },
		});

		// Default: currentPassword verification succeeds (first call),
		// history verification fails (subsequent calls)
		(hashService.verify as ReturnType<typeof vi.fn>)
			.mockResolvedValueOnce(true) // currentPassword check
			.mockResolvedValue(false); // history checks
	});

	function makeHook(): ChangePasswordHook {
		return new ChangePasswordHook(
			historyRepo,
			hashService,
			auditLog,
			accountRepo,
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
				makeHook().before(makeCtx({ body: { currentPassword: 'abc' } })),
			);

			expect(err).toBeInstanceOf(APIError);
			expect((err as APIError).status).toBe(422);
			expect((err as APIError).body).toMatchObject({ error: 'invalid_input' });
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
				'password_change_no_credential_account',
			);
			// Must NOT reach policy checks
			expect(historyRepo.findRecentHashes).not.toHaveBeenCalled();
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

		it('throws 400 when currentPassword is wrong, no policy event emitted', async () => {
			// Override default: currentPassword verification fails
			(hashService.verify as ReturnType<typeof vi.fn>).mockReset();
			(hashService.verify as ReturnType<typeof vi.fn>).mockResolvedValue(false);

			const err = await catchError(() => makeHook().before(makeCtx()));

			expect(err).toBeInstanceOf(APIError);
			expect((err as APIError).status).toBe(400);
			expect((err as APIError).body).toMatchObject({
				error: 'INVALID_PASSWORD',
			});
			expect(recordAuthEvent).toHaveBeenCalledWith(
				'password_change_invalid_credentials',
			);
			// Must NOT reach policy checks
			expect(recordAuthEvent).not.toHaveBeenCalledWith(
				'password_change_complexity_failed',
			);
			expect(recordAuthEvent).not.toHaveBeenCalledWith(
				'password_change_history_violation',
			);
			expect(historyRepo.findRecentHashes).not.toHaveBeenCalled();
		});

		it('throws 422 on complexity failure after credential verification', async () => {
			const err = await catchError(() =>
				makeHook().before(
					makeCtx({
						body: {
							currentPassword: CURRENT_PASSWORD,
							newPassword: 'weakpassword',
						},
					}),
				),
			);

			expect(err).toBeInstanceOf(APIError);
			expect((err as APIError).status).toBe(422);
			expect((err as APIError).body).toMatchObject({
				error: 'password_policy_failed',
			});
			// Credential check must have passed first
			expect(hashService.verify).toHaveBeenCalledWith(
				STORED_HASH,
				CURRENT_PASSWORD,
			);
		});

		it('throws 422 on password history match and emits telemetry', async () => {
			(hashService.verify as ReturnType<typeof vi.fn>).mockReset();
			(hashService.verify as ReturnType<typeof vi.fn>)
				.mockResolvedValueOnce(true) // currentPassword check
				.mockResolvedValueOnce(true); // history check matches

			(
				historyRepo.findRecentHashes as ReturnType<typeof vi.fn>
			).mockResolvedValue(['$argon2id$old']);

			const err = await catchError(() => makeHook().before(makeCtx()));

			expect(err).toBeInstanceOf(APIError);
			expect((err as APIError).status).toBe(422);
			expect((err as APIError).body).toMatchObject({
				error: 'password_history_violation',
			});
			expect(recordAuthEvent).toHaveBeenCalledWith(
				'password_change_history_violation',
			);
		});

		it('succeeds and stores changePasswordCtx', async () => {
			const ctx = makeCtx();

			await expect(makeHook().before(ctx)).resolves.toBeUndefined();

			expect(ctx.context.changePasswordCtx).toMatchObject({
				userId: USER_ID,
			});
			expect(ctx.context.changePasswordCtx).toHaveProperty('correlationId');
			expect(ctx.context.changePasswordCtx).toHaveProperty('ipAddress');
		});

		it('does NOT set revokeOtherSessions (Epic A6)', async () => {
			const ctx = makeCtx();

			await makeHook().before(ctx);

			expect(ctx.body.revokeOtherSessions).toBeUndefined();
		});

		it('verifies credential account before any policy check', async () => {
			const callOrder: string[] = [];
			(
				accountRepo.findCredentialAccount as ReturnType<typeof vi.fn>
			).mockImplementation(async () => {
				callOrder.push('findCredentialAccount');
				return { id: 'acc-1', passwordHash: STORED_HASH };
			});
			(hashService.verify as ReturnType<typeof vi.fn>).mockReset();
			(hashService.verify as ReturnType<typeof vi.fn>).mockImplementation(
				async () => {
					callOrder.push('verify');
					return true;
				},
			);
			(
				historyRepo.findRecentHashes as ReturnType<typeof vi.fn>
			).mockImplementation(async () => {
				callOrder.push('findRecentHashes');
				return [];
			});

			await makeHook().before(makeCtx());

			expect(callOrder[0]).toBe('findCredentialAccount');
			expect(callOrder[1]).toBe('verify');
		});
	});

	describe('after()', () => {
		const baseCtx = {
			userId: USER_ID,
			correlationId: 'corr-1',
			ipAddress: '1.2.3.4',
			userAgent: 'ua',
			ipHash: 'hash',
		};

		it('returns early when no changePasswordCtx', async () => {
			const ctx = makeCtx({ context: {} });
			await makeHook().after(ctx);
			expect(auditLog.log).not.toHaveBeenCalled();
			expect(recordAuthEvent).not.toHaveBeenCalled();
		});

		it('emits failure telemetry on BA error with status and error code', async () => {
			const ctx = makeCtx({
				context: {
					changePasswordCtx: baseCtx,
					returned: { statusCode: 400, body: { code: 'INVALID_PASSWORD' } },
				},
			});

			await makeHook().after(ctx);

			expect(recordAuthEvent).toHaveBeenCalledWith('password_change_failed');
			expect(auditLog.log).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'password_change_failed',
					details: expect.objectContaining({
						correlationId: 'corr-1',
						statusCode: 400,
						errorCode: 'INVALID_PASSWORD',
					}),
				}),
			);
		});

		it('emits success telemetry on success', async () => {
			const ctx = makeCtx({
				context: {
					changePasswordCtx: baseCtx,
					returned: { response: 200 },
				},
			});

			await makeHook().after(ctx);

			expect(recordAuthEvent).toHaveBeenCalledWith('password_change_succeeded');
			expect(auditLog.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'password_change_succeeded' }),
			);
		});
	});
});
