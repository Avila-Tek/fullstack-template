// Outbound port — stores pending T&C acceptance data keyed by correlationId.
// Implemented by RedisPendingTermsStoreAdapter in infrastructure/redis/.

export interface PendingTermsEntry {
	systemTermsId: string;
	systemId: string;
	provider: 'email' | 'google' | 'facebook';
	ipAddress: string;
	userAgent: string;
	/** ISO 8601 — stored as string to survive JSON round-tripping through Redis. */
	termsAcceptedAt: string;
}

export abstract class PendingTermsStorePort {
	abstract set(correlationId: string, entry: PendingTermsEntry): Promise<void>;
	abstract get(correlationId: string): Promise<PendingTermsEntry | null>;
	/**
	 * Non-atomic read + delete (pipeline GET + DEL).
	 * Returns null if the key is already consumed or has expired.
	 * Callers must treat a null return as a no-op.
	 */
	abstract consume(correlationId: string): Promise<PendingTermsEntry | null>;
}
