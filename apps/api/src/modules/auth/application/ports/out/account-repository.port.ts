// Outbound port for the Better Auth `account` table (credential accounts + social links).
// Implemented by DrizzleAccountRepositoryAdapter in infrastructure/database/repositories/.

export interface CredentialAccount {
	id: string;
	passwordHash: string | null;
}

export interface CreateCredentialParams {
	userId: string;
	passwordHash: string;
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
	/** Inserts a new credential account row for a provisioned user. */
	abstract createCredential(params: CreateCredentialParams): Promise<void>;
	/** Removes the credential account for the given user (used to clean up bootstrap credentials on reset failure). */
	abstract deleteCredential(userId: string): Promise<void>;
}
