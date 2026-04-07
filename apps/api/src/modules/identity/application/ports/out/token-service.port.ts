// Outbound port — wraps HMAC token generation/validation.
// Implemented by HmacTokenAdapter in infrastructure/token/.

export type RecoveryTokenResult =
	| { valid: true; userId: string }
	| { valid: false };

export type EmailChangeTokenResult =
	| { valid: true; userId: string; newEmail: string }
	| { valid: false };

export abstract class TokenServicePort {
	abstract generateRecoveryToken(userId: string): string;
	abstract validateRecoveryToken(token: string): RecoveryTokenResult;
	abstract generateEmailChangeToken(userId: string, newEmail: string): string;
	abstract validateEmailChangeToken(token: string): EmailChangeTokenResult;
}
