// Outbound port — persists T&C acceptance records.
// Implemented by DrizzleUserTermsAcceptanceRepository in infrastructure/database/repositories/.

export interface CreateUserTermsAcceptanceInput {
	userId: string;
	/** UUID of the system (resolved from the API key at sign-up time). */
	systemId: string;
	/** UUID of the system_terms row the user accepted. */
	systemTermsId: string;
	/** FK to session.id — null at sign-up time (no session exists yet). */
	sessionId: string | null;
	/** Raw IP address (inet) — null when unavailable behind proxies. */
	ipAddress: string | null;
	userAgent: string | null;
}

export abstract class UserTermsAcceptanceRepositoryPort {
	/**
	 * Records T&C acceptance for a user + system + terms combination.
	 *
	 * Idempotent: silently no-ops when the same (userId, systemId, systemTermsId)
	 * combination already exists (ON CONFLICT DO NOTHING on the unique index).
	 */
	abstract create(input: CreateUserTermsAcceptanceInput): Promise<void>;

	/**
	 * Returns the most-recent acceptance record for a given user + system pair,
	 * or null if the user has never accepted terms for that system.
	 */
	abstract findLatestByUserAndSystem(
		userId: string,
		systemId: string,
	): Promise<{ systemTermsId: string; acceptedAt: Date } | null>;
}
