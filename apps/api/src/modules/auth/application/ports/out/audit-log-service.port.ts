// Outbound port — records an immutable login audit entry (spec §21).
// Implemented by DrizzleAuditLogAdapter in infrastructure/audit-log/.

export interface LoginAttemptParams {
	userId?: string;
	ipAddress: string;
	userAgent: string;
	deviceName: string;
	success: boolean;
	failureReason?: string;
	systemId?: string;
	loginMethod?: string;
	correlationId?: string;
	deviceId?: string;
}

export type SignupEventType =
	| 'signup_attempt'
	| 'signup_success'
	| 'signup_failure'
	| 'signup_duplicate_email'
	| 'signup_captcha_challenge'
	| 'signup_rate_limited'
	| 'signup_tc_version_unavailable'
	| 'signup_tc_version_mismatch'
	| 'email_verification_attempt'
	| 'email_verification_success'
	| 'email_verification_failure_expired'
	| 'email_verification_failure_invalid'
	| 'email_verification_failure_used'
	| 'email_verification_resend'
	| 'email_verification_resend_rate_limited';

export interface SignupAuditParams {
	correlationId: string;
	eventType: SignupEventType;
	ipHash: string;
	userAgent: string;
	userId?: string;
	failureReason?: string;
}

export type SocialAuthEventType =
	| 'social_signup_attempt'
	| 'social_signup_success'
	| 'social_signup_failure'
	| 'social_signup_link'
	| 'social_signup_email_required'
	| 'social_signup_unverified_email_rejected'
	| 'social_signup_email_mismatch_denied'
	| 'oauth_state_mismatch';
// NOTE: social_signup_rate_limited is intentionally absent — BetterAuth evaluates
// customRules before hooks fire, so no hook is reached on 429.

export interface SocialAuthAuditParams {
	correlationId: string;
	eventType: SocialAuthEventType;
	providerId: string;
	ipHash: string;
	userAgent: string;
	userId?: string;
	failureReason?: string;
}

export abstract class AuditLogServicePort {
	abstract logLoginAttempt(params: LoginAttemptParams): Promise<void>;
	abstract logSignupEvent(params: SignupAuditParams): Promise<void>;
	abstract logSocialAuthEvent(params: SocialAuthAuditParams): Promise<void>;
}
