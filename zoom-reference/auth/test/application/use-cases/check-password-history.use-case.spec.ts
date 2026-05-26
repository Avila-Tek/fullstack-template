import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { PasswordHashServicePort } from '../../../src/application/ports/out/password-hash-service.port';
import type { PasswordHistoryRepositoryPort } from '../../../src/application/ports/out/password-history-repository.port';
import { checkPasswordHistory } from '../../../src/application/use-cases/check-password-history.use-case';

const USER_ID = 'user-1';
const RAW_PASSWORD = 'NewSecure1!Pass';

describe('checkPasswordHistory', () => {
	let passwordHistoryRepo: PasswordHistoryRepositoryPort;
	let passwordHashService: PasswordHashServicePort;

	beforeEach(() => {
		passwordHistoryRepo = {
			findRecentHashes: vi.fn(),
			append: vi.fn(),
		};
		passwordHashService = {
			hash: vi.fn(),
			verify: vi.fn(),
		};
	});

	it('returns reused=true when candidate matches a prior hash', async () => {
		const hashes = ['h1', 'h2', 'h3', 'h4', 'h5'];
		vi.mocked(passwordHistoryRepo.findRecentHashes).mockResolvedValue(hashes);
		vi.mocked(passwordHashService.verify).mockImplementation(
			async (hash) => hash === 'h3',
		);

		const result = await checkPasswordHistory(USER_ID, RAW_PASSWORD, {
			passwordHistoryRepo,
			passwordHashService,
			historyDepth: 5,
		});

		expect(result).toEqual({ reused: true });
		expect(passwordHistoryRepo.findRecentHashes).toHaveBeenCalledWith(
			USER_ID,
			5,
		);
	});

	it('returns reused=false when no prior hash matches', async () => {
		vi.mocked(passwordHistoryRepo.findRecentHashes).mockResolvedValue([
			'h1',
			'h2',
		]);
		vi.mocked(passwordHashService.verify).mockResolvedValue(false);

		const result = await checkPasswordHistory(USER_ID, RAW_PASSWORD, {
			passwordHistoryRepo,
			passwordHashService,
			historyDepth: 5,
		});

		expect(result).toEqual({ reused: false });
	});

	it('returns reused=false for empty history (social-only case)', async () => {
		vi.mocked(passwordHistoryRepo.findRecentHashes).mockResolvedValue([]);

		const result = await checkPasswordHistory(USER_ID, RAW_PASSWORD, {
			passwordHistoryRepo,
			passwordHashService,
			historyDepth: 5,
		});

		expect(result).toEqual({ reused: false });
		expect(passwordHashService.verify).not.toHaveBeenCalled();
	});
});
