// Outbound port — deterministic keyed hashing for API keys.
// Implemented by HmacApiKeyHashAdapter in infrastructure/hash/.
// MUST NOT be Argon2 — API key lookup is on the hot path and must be fast.

export abstract class ApiKeyHashPort {
	/** Produces a deterministic keyed hash of the raw API key for storage. */
	abstract hash(rawKey: string): string;
}
