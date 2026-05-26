import type { JwkEntity } from '../../../domain/entities/jwk.entity';

// Outbound port — fetches ES256 signing/verification keys from the jwk table.
// Implemented by DrizzleJwkRepository in infrastructure/database/repositories/.
export abstract class JwkRepositoryPort {
	// Returns the first active key (revokedAt IS NULL), or null if none exists.
	abstract getActiveKey(): Promise<JwkEntity | null>;
	// Returns all non-revoked keys for JWKS publication. Includes every key
	// that consumers may still need for token verification (e.g. after rotation).
	abstract getAllVerificationKeys(): Promise<JwkEntity[]>;
}
