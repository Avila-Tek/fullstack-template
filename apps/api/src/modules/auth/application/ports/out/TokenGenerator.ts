/**
 * Payload embedded in access tokens.
 */
export interface TokenPayload {
	userId: string;
	email: string;
	roleId: string | null;
}

/**
 * Port for generating authentication tokens.
 */
export abstract class TokenGenerator {
	/**
	 * Generate an access token with the given payload.
	 * @param payload - User identity data to embed in token
	 * @returns Signed JWT token
	 */
	abstract generate(payload: TokenPayload): Promise<string>;
}
