export abstract class PasswordHistoryRepositoryPort {
	/** Returns the last `limit` Argon2id hashes for the user (most recent first). */
	abstract findRecentHashes(userId: string, limit: number): Promise<string[]>;
	/** Appends a new hash and prunes entries beyond the limit. */
	abstract append(userId: string, hash: string): Promise<void>;
}
