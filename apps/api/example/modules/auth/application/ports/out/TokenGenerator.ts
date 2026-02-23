/**
 * Payload embedded in access tokens.
 */
export interface TokenPayload {
  userId: string;
  email: string;
}

/**
 * Port for generating authentication tokens.
 */
export abstract class TokenGenerator {
  abstract generate(payload: TokenPayload): Promise<string>;
  abstract generateRefresh(): Promise<string>;
}
