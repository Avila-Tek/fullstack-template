import { createHash, randomBytes } from 'node:crypto';

/**
 * Value object for the invitation token.
 *
 * Security contract:
 *   - `plaintext` is 32 random bytes encoded as 64-char hex.
 *     Sent in the email link; never stored in the database.
 *   - `hash` is the SHA-256 digest of the plaintext (64-char hex).
 *     The only value persisted in `business_account_invite.token_hash`.
 */
export class InviteToken {
	private constructor(
		readonly plaintext: string,
		readonly hash: string,
	) {}

	/** Generate a new random token. */
	static generate(): InviteToken {
		const plaintext = randomBytes(32).toString('hex');
		return InviteToken.fromPlaintext(plaintext);
	}

	/** Re-derive the hash from a known plaintext (e.g. for verification). */
	static fromPlaintext(plaintext: string): InviteToken {
		const hash = createHash('sha256').update(plaintext).digest('hex');
		return new InviteToken(plaintext, hash);
	}
}
