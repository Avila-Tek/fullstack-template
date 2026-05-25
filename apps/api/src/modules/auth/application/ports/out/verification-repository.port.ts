// Outbound port — reads Better Auth verification records from Redis secondary storage.
// BA writes verification tokens to Redis (not Postgres) when secondaryStorage is configured.
// Redis key format: better-auth:verification:reset-password:<rawToken>

export interface VerificationRecord {
	identifier: string;
	value: string; // userId for password-reset verifications
	expiresAt: Date;
	createdAt: Date;
	updatedAt: Date;
}

export abstract class VerificationRepositoryPort {
	abstract findByResetToken(
		rawToken: string,
	): Promise<VerificationRecord | null>;
}
