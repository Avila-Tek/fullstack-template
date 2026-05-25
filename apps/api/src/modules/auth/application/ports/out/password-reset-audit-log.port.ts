// Outbound port — appends password-reset flow events to security_audit_log.
// Implemented by DrizzlePasswordResetAuditLogAdapter in infrastructure/database/.

export type PasswordResetAuditEventType =
	| 'password_reset_requested'
	| 'password_reset_email_sent'
	| 'password_reset_email_send_failed'
	| 'password_reset_rate_limited'
	| 'password_reset_token_opened'
	| 'password_reset_succeeded'
	| 'password_reset_failed_expired'
	| 'password_reset_failed_replayed'
	| 'password_reset_sessions_invalidated'
	| 'password_history_violation'
	| 'first_password_set'
	| 'user_email_verified_via_password_reset'
	| 'recovery_blocked_unverified_self_registered';

export interface PasswordResetAuditEventParams {
	eventType: PasswordResetAuditEventType;
	userId?: string;
	ipAddress?: string;
	userAgent?: string;
	details?: Record<string, unknown>;
}

export abstract class PasswordResetAuditLogPort {
	abstract log(params: PasswordResetAuditEventParams): Promise<void>;
}
