import { boolean, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { device } from '@/infrastructure/database/db-schema';
import { user } from './user.schema';

// Spec §21 — immutable audit trail; rows are inserted, never updated or deleted
export const loginAuditLog = pgTable('login_audit_log', {
	id: text('id').primaryKey(),
	// Nullable: failure rows have no authenticated userId
	userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
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
	systemId: uuid('system_id'),
	loginMethod: text('login_method'),
	correlationId: text('correlation_id'),
	deviceId: text('device_id').references(() => device.id),
});

export type LoginAuditLog = typeof loginAuditLog.$inferSelect;
export type NewLoginAuditLog = typeof loginAuditLog.$inferInsert;
