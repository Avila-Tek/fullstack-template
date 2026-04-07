// Outbound port — records an immutable login audit entry (spec §21).
// Implemented by DrizzleAuditLogAdapter in infrastructure/audit-log/.

export interface LoginAttemptParams {
	userId: string;
	ipAddress: string;
	userAgent: string;
	deviceName: string;
	success: boolean;
	failureReason?: string;
}

export type SignupEventType =
	| 'signup_attempt'
	| 'signup_success'
	| 'signup_failure'
	| 'signup_duplicate_email'
	| 'signup_captcha_challenge'
	| 'signup_rate_limited'
	| 'signup_tc_version_unavailable'
	| 'signup_tc_version_mismatch';

export interface SignupAuditParams {
	correlationId: string;
	eventType: SignupEventType;
	ipHash: string;
	userAgent: string;
	userId?: string;
	failureReason?: string;
}

export abstract class AuditLogServicePort {
	abstract logLoginAttempt(params: LoginAttemptParams): Promise<void>;
	abstract logSignupEvent(params: SignupAuditParams): Promise<void>;
}
