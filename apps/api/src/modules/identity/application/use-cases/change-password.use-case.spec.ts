import { describe, expect, it, vi } from 'vitest';
import type { IStructuredLogger } from '@/shared/domain-utils';
import { InvalidCredentialsException } from '../../domain/exceptions/invalid-credentials.exception';
import { InvalidPasswordException } from '../../domain/exceptions/invalid-password.exception';
import { NoPasswordAccountException } from '../../domain/exceptions/no-password-account.exception';
import { PasswordReuseException } from '../../domain/exceptions/password-reuse.exception';
import type { AccountRepositoryPort } from '../ports/out/account-repository.port';
import type { PasswordHashServicePort } from '../ports/out/password-hash-service.port';
import type { PasswordHistoryRepositoryPort } from '../ports/out/password-history-repository.port';
import type { SessionRepositoryPort } from '../ports/out/session-repository.port';
import { ChangePasswordUseCase } from './change-password.use-case';

function makeLogger(): IStructuredLogger {
	return {
		error: vi.fn(),
		warn: vi.fn(),
		info: vi.fn(),
		debug: vi.fn(),
	} as unknown as IStructuredLogger;
}

function makeDeps() {
	const accountRepo: AccountRepositoryPort = {
		findCredentialAccount: vi.fn(),
		updatePassword: vi.fn(),
		unlinkSocialAccountsExcept: vi.fn(),
	};
	const sessionRepo: SessionRepositoryPort = {
		revokeAllForUser: vi.fn().mockResolvedValue(2),
	};
	const passwordHistoryRepo: PasswordHistoryRepositoryPort = {
		findRecentHashes: vi.fn().mockResolvedValue([]),
		append: vi.fn(),
	};
	const hashService: PasswordHashServicePort = {
		hash: vi.fn().mockResolvedValue('new-hash'),
		verify: vi.fn().mockResolvedValue(true),
	};
	const logger = makeLogger();
	return { accountRepo, sessionRepo, passwordHistoryRepo, hashService, logger };
}

const VALID_NEW_PASSWORD = 'NewStr0ng!Pass';

describe('ChangePasswordUseCase', () => {
	it('returns NoPasswordAccountException when no credential account exists', async () => {
		const deps = makeDeps();
		vi.mocked(deps.accountRepo.findCredentialAccount).mockResolvedValue(null);
		const uc = new ChangePasswordUseCase(
			deps.accountRepo,
			deps.sessionRepo,
			deps.passwordHistoryRepo,
			deps.hashService,
			deps.logger,
		);

		const result = await uc.execute('user-1', 'old', VALID_NEW_PASSWORD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBeInstanceOf(NoPasswordAccountException);
		}
	});

	it('returns InvalidCredentialsException when current password is wrong', async () => {
		const deps = makeDeps();
		vi.mocked(deps.accountRepo.findCredentialAccount).mockResolvedValue({
			id: 'acc-1',
			passwordHash: 'hashed',
		});
		vi.mocked(deps.hashService.verify).mockResolvedValue(false);

		const uc = new ChangePasswordUseCase(
			deps.accountRepo,
			deps.sessionRepo,
			deps.passwordHistoryRepo,
			deps.hashService,
			deps.logger,
		);

		const result = await uc.execute('user-1', 'wrong', VALID_NEW_PASSWORD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBeInstanceOf(InvalidCredentialsException);
		}
	});

	it('returns InvalidPasswordException when new password fails complexity', async () => {
		const deps = makeDeps();
		vi.mocked(deps.accountRepo.findCredentialAccount).mockResolvedValue({
			id: 'acc-1',
			passwordHash: 'hashed',
		});
		// First call: verify current password (true). No history calls needed.
		vi.mocked(deps.hashService.verify).mockResolvedValue(true);

		const uc = new ChangePasswordUseCase(
			deps.accountRepo,
			deps.sessionRepo,
			deps.passwordHistoryRepo,
			deps.hashService,
			deps.logger,
		);

		const result = await uc.execute('user-1', 'current', 'weak');

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBeInstanceOf(InvalidPasswordException);
		}
	});

	it('returns PasswordReuseException when new password matches history', async () => {
		const deps = makeDeps();
		vi.mocked(deps.accountRepo.findCredentialAccount).mockResolvedValue({
			id: 'acc-1',
			passwordHash: 'hashed',
		});
		vi.mocked(deps.passwordHistoryRepo.findRecentHashes).mockResolvedValue([
			'old-hash-1',
		]);
		// First verify: current password check (true)
		// Second verify: history check against old-hash-1 (true — reuse detected)
		vi.mocked(deps.hashService.verify)
			.mockResolvedValueOnce(true)
			.mockResolvedValueOnce(true);

		const uc = new ChangePasswordUseCase(
			deps.accountRepo,
			deps.sessionRepo,
			deps.passwordHistoryRepo,
			deps.hashService,
			deps.logger,
		);

		const result = await uc.execute('user-1', 'current', VALID_NEW_PASSWORD);

		expect(result.success).toBe(false);
		if (!result.success) {
			expect(result.error).toBeInstanceOf(PasswordReuseException);
		}
	});

	it('succeeds: updates password, revokes sessions, appends history', async () => {
		const deps = makeDeps();
		vi.mocked(deps.accountRepo.findCredentialAccount).mockResolvedValue({
			id: 'acc-1',
			passwordHash: 'hashed',
		});
		vi.mocked(deps.passwordHistoryRepo.findRecentHashes).mockResolvedValue([]);
		vi.mocked(deps.hashService.verify).mockResolvedValue(true);
		vi.mocked(deps.hashService.hash).mockResolvedValue('new-hash');

		const uc = new ChangePasswordUseCase(
			deps.accountRepo,
			deps.sessionRepo,
			deps.passwordHistoryRepo,
			deps.hashService,
			deps.logger,
		);

		const result = await uc.execute('user-1', 'current', VALID_NEW_PASSWORD);

		expect(result).toEqual({ success: true, data: null });
		expect(deps.accountRepo.updatePassword).toHaveBeenCalledWith(
			'acc-1',
			'new-hash',
		);
		expect(deps.sessionRepo.revokeAllForUser).toHaveBeenCalledWith('user-1');
		expect(deps.passwordHistoryRepo.append).toHaveBeenCalledWith(
			'user-1',
			'new-hash',
		);
	});
});
