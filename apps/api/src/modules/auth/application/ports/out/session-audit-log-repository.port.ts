export type SessionEventType =
	| 'session_logout'
	| 'session_expired_inactivity'
	| 'session_invalidated_credential_change'
	| 'jwt_refresh_succeeded'
	| 'jwt_refresh_failed_revoked'
	| 'jwt_refresh_failed_expired'
	| 'jwt_refresh_failed_system_key';

export interface InsertSessionEventParams {
	userId: string;
	sessionId?: string;
	systemId?: string;
	eventType: SessionEventType;
	ipAddress?: string;
	userAgent?: string;
	correlationId: string;
	failureReason?: string;
}

export abstract class SessionAuditLogRepositoryPort {
	abstract insertEvent(params: InsertSessionEventParams): Promise<void>;
}
