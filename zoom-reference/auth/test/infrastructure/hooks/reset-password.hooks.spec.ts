import { APIError } from 'better-auth';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/shared/logger/audit-logger', () => ({
	auditLogger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../../src/shared/metrics/auth-metrics', () => ({
	recordAuthEvent: vi.fn(),
}));

import type {
	AccountRepositoryPort,
	CredentialAccount,
} from '../../../src/application/ports/out/account-repository.port';
import type { PasswordHashServicePort } from '../../../src/application/ports/out/password-hash-service.port';
import type { PasswordHistoryRepositoryPort } from '../../../src/application/ports/out/password-history-repository.port';
import type { PasswordResetAuditLogPort } from '../../../src/application/ports/out/password-reset-audit-log.port';
import type { UserRepositoryPort } from '../../../src/application/ports/out/user-repository.port';
import type {
	VerificationRecord,
	VerificationRepositoryPort,
} from '../../../src/application/ports/out/verification-repository.port';
import { User } from '../../../src/domain/entities/user.entity';
import { Email } from '../../../src/domain/value-objects/user.value-object';
import { ResetPasswordHook } from '../../../src/infrastructure/hooks/reset-password.hooks';
import { recordAuthEvent } from '../../../src/shared/metrics/auth-metrics';

const VALID_TOKEN = 'raw-token-abc';
const NEW_PASSWORD = 'NewSecure1!Pass';
const USER_ID = '11111111-2222-4333-8444-555555555555';

const nowPlus = (ms: number) => new Date(Date.now() + ms);
const nowMinus = (ms: number) => new Date(Date.now() - ms);

function verificationRecord(
	overrides: Partial<VerificationRecord> = {},
): VerificationRecord {
	return {
		identifier: `reset-password:${VALID_TOKEN}`,
		value: USER_ID,
		expiresAt: nowPlus(60_000),
		createdAt: new Date(),
		updatedAt: new Date(),
		...overrides,
	};
}

function credential(
	overrides: Partial<CredentialAccount> = {},
): CredentialAccount {
	return { id: 'acc-1', passwordHash: '$argon2id$hash', ...overrides };
}

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
		path: '/reset-password',
		body: overrides.body ?? { token: VALID_TOKEN, newPassword: NEW_PASSWORD },
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

describe('ResetPasswordHook', () => {
	let verificationRepo: VerificationRepositoryPort;
	let accountRepo: AccountRepositoryPort;
	let userRepo: UserRepositoryPort;
	let historyRepo: PasswordHistoryRepositoryPort;
	let hashService: PasswordHashServicePort;
	let auditLog: PasswordResetAuditLogPort;

	beforeEach(() => {
		vi.clearAllMocks();
		verificationRepo = {
			findByResetToken: vi.fn().mockResolvedValue(verificationRecord()),
		};
		accountRepo = {
			findCredentialAccount: vi.fn().mockResolvedValue(credential()),
			updatePassword: vi.fn(),
			unlinkSocialAccountsExcept: vi.fn(),
			createCredential: vi.fn(),
			deleteCredential: vi.fn(),
		};
		userRepo = {
			findById: vi.fn().mockResolvedValue(
				User.reconstitute({
					id: USER_ID,
					email: Email.create('user@example.com'),
					emailVerified: true,
				}),
			),
			findByEmail: vi.fn(),
			findByNormalizedEmail: vi.fn(),
			save: vi.fn(),
			updateSessionInvalidBefore: vi.fn().mockResolvedValue(undefined),
			updateTwoFactorEnabled: vi.fn(),
			createProvisioned: vi.fn(),
			markEmailVerified: vi.fn().mockResolvedValue(undefined),
		};
		historyRepo = {
			findRecentHashes: vi.fn().mockResolvedValue([]),
			append: vi.fn(),
		};
		hashService = {
			hash: vi.fn().mockResolvedValue('$argon2id$bootstrap-hash'),
			verify: vi.fn().mockResolvedValue(false),
		};
		auditLog = { log: vi.fn().mockResolvedValue(undefined) };
	});

	function makeHook(): ResetPasswordHook {
		return new ResetPasswordHook(
			verificationRepo,
			accountRepo,
			userRepo,
			historyRepo,
			hashService,
			auditLog,
		);
	}

	describe('before()', () => {
		it('standard happy path: stashes passwordResetCtx and audits token_opened', async () => {
			const ctx = makeCtx();

			await expect(makeHook().before(ctx)).resolves.toBeUndefined();

			expect(ctx.context.passwordResetCtx).toMatchObject({
				userId: USER_ID,
				isProvisioned: false,
				isSocialOnlyFirstPassword: false,
			});
			expect(auditLog.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'password_reset_token_opened' }),
			);
		});

		it('throws 422 password_policy_failed on weak new password', async () => {
			const err = await catchError(() =>
				makeHook().before(
					makeCtx({ body: { token: VALID_TOKEN, newPassword: 'weak' } }),
				),
			);
			expect(err).toBeInstanceOf(APIError);
			expect((err as APIError).status).toBe(422);
			expect((err as APIError).body).toMatchObject({
				error: 'password_policy_failed',
			});
		});

		it('throws 422 token_invalid when verification row is missing', async () => {
			(
				verificationRepo.findByResetToken as ReturnType<typeof vi.fn>
			).mockResolvedValue(null);

			const err = await catchError(() => makeHook().before(makeCtx()));

			expect(err).toBeInstanceOf(APIError);
			expect((err as APIError).body).toMatchObject({ error: 'token_invalid' });
			expect(auditLog.log).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'password_reset_failed_replayed',
				}),
			);
		});

		it('throws 422 token_expired when verification is past expiry', async () => {
			(
				verificationRepo.findByResetToken as ReturnType<typeof vi.fn>
			).mockResolvedValue(verificationRecord({ expiresAt: nowMinus(60_000) }));

			const err = await catchError(() => makeHook().before(makeCtx()));

			expect(err).toBeInstanceOf(APIError);
			expect((err as APIError).body).toMatchObject({ error: 'token_expired' });
			expect(auditLog.log).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'password_reset_failed_expired',
				}),
			);
		});

		it('throws 422 password_history_violation when new password matches a prior hash', async () => {
			(
				historyRepo.findRecentHashes as ReturnType<typeof vi.fn>
			).mockResolvedValue(['$argon2id$old']);
			(hashService.verify as ReturnType<typeof vi.fn>).mockResolvedValue(true);

			const err = await catchError(() => makeHook().before(makeCtx()));

			expect(err).toBeInstanceOf(APIError);
			expect((err as APIError).body).toMatchObject({
				error: 'password_history_violation',
			});
		});

		it('BR-13: throws 422 account_not_eligible for unverified self-registered user', async () => {
			(userRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
				User.reconstitute({
					id: USER_ID,
					email: Email.create('user@example.com'),
					emailVerified: false,
				}),
			);
			(
				accountRepo.findCredentialAccount as ReturnType<typeof vi.fn>
			).mockResolvedValue(null);

			const err = await catchError(() => makeHook().before(makeCtx()));

			expect(err).toBeInstanceOf(APIError);
			expect((err as APIError).body).toMatchObject({
				error: 'account_not_eligible',
			});
			expect(auditLog.log).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'recovery_blocked_unverified_self_registered',
				}),
			);
		});

		it('BR-13 exception: allows unverified user WITH credential (provisioned)', async () => {
			(userRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(
				User.reconstitute({
					id: USER_ID,
					email: Email.create('user@example.com'),
					emailVerified: false,
				}),
			);

			const ctx = makeCtx();
			await expect(makeHook().before(ctx)).resolves.toBeUndefined();
			expect(ctx.context.passwordResetCtx).toMatchObject({
				userId: USER_ID,
				isProvisioned: true,
			});
		});

		it('social-only: creates bootstrap credential and skips history check', async () => {
			(
				accountRepo.findCredentialAccount as ReturnType<typeof vi.fn>
			).mockResolvedValue(null);

			const ctx = makeCtx();
			await makeHook().before(ctx);

			expect(accountRepo.createCredential).toHaveBeenCalledWith(
				expect.objectContaining({ userId: USER_ID }),
			);
			expect(ctx.context.passwordResetCtx).toMatchObject({
				isSocialOnlyFirstPassword: true,
			});
			expect(historyRepo.findRecentHashes).not.toHaveBeenCalled();
		});
	});

	describe('after()', () => {
		const baseResetCtx = {
			userId: USER_ID,
			correlationId: 'corr-1',
			ipAddress: '1.2.3.4',
			userAgent: 'ua',
			isProvisioned: false,
			isSocialOnlyFirstPassword: false,
		};

		it('happy path: updates sessionInvalidBefore and emits full telemetry for success', async () => {
			const ctx = makeCtx({
				context: {
					passwordResetCtx: baseResetCtx,
					returned: { response: 200 },
				},
			});

			await makeHook().after(ctx);

			expect(userRepo.updateSessionInvalidBefore).toHaveBeenCalledWith(
				USER_ID,
				expect.any(Date),
			);
			expect(auditLog.log).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'password_reset_sessions_invalidated',
				}),
			);
			expect(auditLog.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'password_reset_succeeded' }),
			);
			expect(recordAuthEvent).toHaveBeenCalledWith('password_reset_succeeded');
			expect(recordAuthEvent).toHaveBeenCalledWith(
				'password_reset_sessions_invalidated',
			);
		});

		it('provisioned: flips emailVerified and audits user_email_verified_via_password_reset', async () => {
			const ctx = makeCtx({
				context: {
					passwordResetCtx: { ...baseResetCtx, isProvisioned: true },
					returned: { response: 200 },
				},
			});

			await makeHook().after(ctx);

			expect(userRepo.markEmailVerified).toHaveBeenCalledWith(USER_ID);
			expect(auditLog.log).toHaveBeenCalledWith(
				expect.objectContaining({
					eventType: 'user_email_verified_via_password_reset',
				}),
			);
		});

		it('social-only: audits first_password_set', async () => {
			const ctx = makeCtx({
				context: {
					passwordResetCtx: {
						...baseResetCtx,
						isSocialOnlyFirstPassword: true,
					},
					returned: { response: 200 },
				},
			});

			await makeHook().after(ctx);

			expect(auditLog.log).toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'first_password_set' }),
			);
		});

		it('BA error + social-only: deletes bootstrap credential and skips success side effects', async () => {
			const ctx = makeCtx({
				context: {
					passwordResetCtx: {
						...baseResetCtx,
						isSocialOnlyFirstPassword: true,
					},
					returned: { statusCode: 400, body: { code: 'INVALID_TOKEN' } },
				},
			});

			await makeHook().after(ctx);

			expect(accountRepo.deleteCredential).toHaveBeenCalledWith(USER_ID);
			expect(userRepo.updateSessionInvalidBefore).not.toHaveBeenCalled();
			expect(auditLog.log).not.toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'password_reset_succeeded' }),
			);
			expect(auditLog.log).not.toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'first_password_set' }),
			);
		});

		it('BA error: skips success side effects and emits failure telemetry', async () => {
			const ctx = makeCtx({
				context: {
					passwordResetCtx: baseResetCtx,
					returned: { statusCode: 400, body: { code: 'INVALID_TOKEN' } },
				},
			});

			await makeHook().after(ctx);

			expect(userRepo.updateSessionInvalidBefore).not.toHaveBeenCalled();
			expect(auditLog.log).not.toHaveBeenCalledWith(
				expect.objectContaining({ eventType: 'password_reset_succeeded' }),
			);
			expect(recordAuthEvent).toHaveBeenCalledWith(
				'password_reset_failed_replayed',
			);
		});

		it('returns early when no reset context is stashed', async () => {
			const ctx = makeCtx({ context: {} });
			await makeHook().after(ctx);
			expect(userRepo.updateSessionInvalidBefore).not.toHaveBeenCalled();
		});
	});
});
