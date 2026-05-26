// Outbound port — per-email rate limiting for /request-password-reset.
// Per-IP rate limiting is handled by Better Auth's customRules, not this port.

export interface RateLimitResult {
	allowed: boolean;
	remaining?: number;
	retryAfterSeconds?: number;
}

export abstract class PasswordResetRateLimitPort {
	abstract hitEmail(normalizedEmailHash: string): Promise<RateLimitResult>;
}
