// Outbound port for the Better Auth `account` table (credential accounts + social links).
// Implemented by DrizzleAccountRepositoryAdapter in infrastructure/persistence/repositories/.

export interface CredentialAccount {
	id: string;
	passwordHash: string | null;
}

export abstract class AccountRepositoryPort {
	/** Returns the credential (email+password) account for the user, or null for social-only users. */
	abstract findCredentialAccount(
		userId: string,
	): Promise<CredentialAccount | null>;
	/** Replaces the stored Argon2id hash on the credential account. */
	abstract updatePassword(accountId: string, newHash: string): Promise<void>;
	/** Unlinks social accounts whose providerEmail does not match keptEmail (spec §10). */
	abstract unlinkSocialAccountsExcept(
		userId: string,
		keptEmail: string,
	): Promise<void>;
}
