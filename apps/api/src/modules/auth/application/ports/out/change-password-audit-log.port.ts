export type ChangePasswordAuditEventType =
	| 'password_change_no_credential_account'
	| 'password_change_invalid_credentials'
	| 'password_change_history_violation'
	| 'password_change_complexity_failed'
	| 'password_change_failed'
	| 'password_change_succeeded';

export interface ChangePasswordAuditEventParams {
	eventType: ChangePasswordAuditEventType;
	userId?: string;
	ipAddress?: string;
	userAgent?: string;
	details?: Record<string, unknown>;
}

export abstract class ChangePasswordAuditLogPort {
	abstract log(params: ChangePasswordAuditEventParams): Promise<void>;
}
