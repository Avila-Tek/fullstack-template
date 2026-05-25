// Tracks pending change-email initiations to enforce OQ-03: a new initiation
// invalidates any prior in-flight change-email JWT for the same user.
//
// Stored in Redis under key: auth:change-email-pending:<userId>
// TTL kept aligned with env.VERIFICATION_TOKEN_TTL_HOURS.

export interface ChangeEmailPending {
	newEmail: string;
	normalizedNewEmail: string;
	oldEmail: string;
	createdAt: string; // ISO 8601
}

export abstract class ChangeEmailPendingPort {
	/** Write/overwrite the pending record. Overwriting is the OQ-03 invalidation mechanism. */
	abstract set(
		userId: string,
		record: ChangeEmailPending,
		ttlSeconds: number,
	): Promise<void>;

	/** Returns the pending record, or null if missing or TTL expired. */
	abstract get(userId: string): Promise<ChangeEmailPending | null>;

	/** Remove the pending record after successful email-change confirmation. */
	abstract delete(userId: string): Promise<void>;
}
