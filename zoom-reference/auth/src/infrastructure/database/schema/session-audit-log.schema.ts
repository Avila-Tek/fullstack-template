import { pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './user.schema';

export const sessionEventTypeEnum = pgEnum('session_event_type', [
	'session_logout',
	'session_expired_inactivity',
	'session_invalidated_credential_change',
	'jwt_refresh_succeeded',
	'jwt_refresh_failed_revoked',
	'jwt_refresh_failed_expired',
	'jwt_refresh_failed_system_key',
]);

export const sessionAuditLog = pgTable('session_audit_log', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	sessionId: text('session_id'),
	// S-009: which system the session was scoped to (nullable — not all events have system context)
	systemId: text('system_id'),
	eventType: sessionEventTypeEnum('event_type').notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	correlationId: text('correlation_id').notNull(),
	failureReason: text('failure_reason'),
	createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
		.notNull()
		.defaultNow(),
});
