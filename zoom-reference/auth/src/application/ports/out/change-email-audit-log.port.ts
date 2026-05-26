export type ChangeEmailAuditEventType =
	| 'email_change_initiated'
	| 'email_change_verification_sent'
	| 'email_change_completed'
	| 'email_change_failed'
	| 'email_change_expired'
	| 'email_change_no_password_account'
	| 'email_change_invalid_credentials'
	| 'email_change_collision_silent'
	| 'social_methods_disconnected';

// Note: `profile_email_sync_failed` is intentionally NOT in this union.
// That event is emitted by the orchestrator via its own logger + Prometheus counter,
// not via this port — there is no DB row in apps/auth's `security_audit_log` for it.

export interface ChangeEmailAuditEventParams {
	eventType: ChangeEmailAuditEventType;
	userId?: string;
	ipAddress?: string;
	userAgent?: string;
	details?: Record<string, unknown>;
}

export abstract class ChangeEmailAuditLogPort {
	abstract log(params: ChangeEmailAuditEventParams): Promise<void>;
}
