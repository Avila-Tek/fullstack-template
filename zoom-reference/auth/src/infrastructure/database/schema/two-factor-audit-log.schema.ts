import { pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { TWO_FACTOR_EVENT_TYPES } from '../../../application/ports/out/two-factor-audit-log-repository.port';

// Immutable audit trail for 2FA enrollment events; rows are inserted, never updated or deleted.

export const twoFactorEventTypeEnum = pgEnum(
	'two_factor_event_type',
	TWO_FACTOR_EVENT_TYPES,
);

export type TwoFactorEventType =
	(typeof twoFactorEventTypeEnum.enumValues)[number];

export const twoFactorAuditLog = pgTable('two_factor_audit_log', {
	id: text('id').primaryKey(),
	correlationId: text('correlation_id').notNull(),
	eventType: twoFactorEventTypeEnum('event_type').notNull(),
	userId: text('user_id').notNull(),
	// Which method was used/attempted — may be null if not yet determined at the time of event
	method: text('method'),
	ipHash: text('ip_hash').notNull(),
	userAgent: text('user_agent').notNull(),
	timestamp: timestamp('timestamp', { mode: 'date', withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type TwoFactorAuditLog = typeof twoFactorAuditLog.$inferSelect;
export type NewTwoFactorAuditLog = typeof twoFactorAuditLog.$inferInsert;
