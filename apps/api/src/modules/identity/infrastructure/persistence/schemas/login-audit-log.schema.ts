import { boolean, index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './user.schema';

// Spec §21 — immutable audit trail; rows are inserted, never updated or deleted
export const loginAuditLog = pgTable(
	'login_audit_log',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		timestamp: timestamp('timestamp', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
		ipAddress: text('ip_address').notNull(),
		userAgent: text('user_agent').notNull(),
		// Derived from User-Agent — stored so reports don't need to re-parse
		deviceName: text('device_name').notNull(),
		success: boolean('success').notNull(),
		// Optional: failure reason code for analysis ("INVALID_PASSWORD", etc.)
		failureReason: text('failure_reason'),
	},
	(table) => [index('idx_login_audit_log_user_id').on(table.userId)],
);

export type LoginAuditLog = typeof loginAuditLog.$inferSelect;
export type NewLoginAuditLog = typeof loginAuditLog.$inferInsert;
