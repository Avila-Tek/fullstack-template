import type { PasswordHashServicePort } from '../ports/out/password-hash-service.port';
import type { PasswordHistoryRepositoryPort } from '../ports/out/password-history-repository.port';

export interface CheckPasswordHistoryDeps {
	passwordHistoryRepo: PasswordHistoryRepositoryPort;
	passwordHashService: PasswordHashServicePort;
	historyDepth: number;
}

export interface CheckPasswordHistoryResult {
	reused: boolean;
}

export async function checkPasswordHistory(
	userId: string,
	rawPassword: string,
	deps: CheckPasswordHistoryDeps,
): Promise<CheckPasswordHistoryResult> {
	const recentHashes = await deps.passwordHistoryRepo.findRecentHashes(
		userId,
		deps.historyDepth,
	);
	for (const hash of recentHashes) {
		if (await deps.passwordHashService.verify(hash, rawPassword)) {
			return { reused: true };
		}
	}
	return { reused: false };
}
