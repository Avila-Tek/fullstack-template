// JWK value object — represents an active (non-revoked) signing key.
// The repo only returns keys where revokedAt IS NULL, so revokedAt is omitted here.
export interface JwkEntity {
	id: string;
	kid: string;
	// Public key serialized as JWK JSON string
	publicJwk: string;
	// Private key as stored by Better Auth's jwt plugin: the encrypted
	// envelope (JSON.stringify(symmetricEncrypt(...))). Consumers must call
	// symmetricDecrypt with BETTER_AUTH_SECRET before parsing as JWK JSON.
	privateJwk: string;
	algorithm: 'ES256';
}
