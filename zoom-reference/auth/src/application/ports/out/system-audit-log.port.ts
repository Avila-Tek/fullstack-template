// Outbound port — appends to the security_audit_log table.
// Implemented by DrizzleSystemAuditLogAdapter in infrastructure/database/.

export type SystemAuditEventType =
	| 'account_locked'
	| 'admin_session_revoke_2fa_forced'
	| 'admin_session_revoked'
	| 'admin_sessions_listed'
	| 'failed_login_alert_sent'
	| 'failed_login_alert_skipped_no_account'
	| 'jwt_issued'
	| 'jwt_refresh_issued'
	| 'new_device_detected'
	| 'jwt_refresh_succeeded'
	| 'member_access_granted_path_a'
	| 'member_access_granted_path_b'
	| 'member_access_grant_failed_path_a'
	| 'member_access_grant_failed_path_b'
	| 'member_access_idempotent'
	| 'member_access_revoked'
	| 'member_role_update_failed'
	| 'member_role_updated'
	| 'oauth_context_invalid'
	| 'oauth_context_lost'
	| 'open_system_auto_enrolled'
	| 'session_revoked_new_login'
	| 'system_admin_unauthorized'
	| 'system_deactivated'
	| 'system_inactive_rejected'
	| 'system_key_invalid'
	| 'system_key_resolved'
	| 'system_key_rotated'
	| 'system_registered'
	| 'system_updated';

export interface SystemAuditEventParams {
	eventType: SystemAuditEventType;
	// Not present for middleware-level events (no platform admin involved)
	platformAdminUserId?: string;
	targetUserId?: string;
	// Not present for system_key_invalid events (key did not resolve)
	systemId?: string;
	keyPrefix?: string;
	ipAddress?: string;
	userAgent?: string;
	details?: Record<string, unknown>;
}

export abstract class SystemAuditLogPort {
	abstract log(params: SystemAuditEventParams): Promise<void>;
}
