// Outbound port — decouples use cases from the Argon2id implementation.
// Implemented by Argon2HashAdapter in infrastructure/hash/.

export abstract class PasswordHashServicePort {
	abstract hash(plaintext: string): Promise<string>;
	abstract verify(hash: string, candidate: string): Promise<boolean>;
}
