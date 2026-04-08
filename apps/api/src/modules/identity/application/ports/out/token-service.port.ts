export type EmailChangeTokenResult =
	| { valid: true; userId: string; newEmail: string }
	| { valid: false };

export abstract class TokenServicePort {
	abstract generateEmailChangeToken(userId: string, newEmail: string): string;
	abstract validateEmailChangeToken(token: string): EmailChangeTokenResult;
}
