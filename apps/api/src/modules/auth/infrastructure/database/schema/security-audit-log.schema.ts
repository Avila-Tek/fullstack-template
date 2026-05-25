import {
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

// Spec §11 / §16 — immutable security and system lifecycle audit trail.
// Rows are ONLY inserted — no UPDATE or DELETE ever issued against this table.
export const securityAuditLog = pgTable('security_audit_log', {
	id: uuid('id').primaryKey().defaultRandom(),

	// Event type — one of the known system lifecycle event strings
	eventType: text('event_type').notNull(),

	// FK → user.id (Better Auth text PK) — the platform admin who triggered the event
	platformAdminUserId: text('platform_admin_user_id'),

	// FK → user.id (Better Auth text PK) — the user who is affected by the event
	targetUserId: text('target_user_id'),

	// FK → system.id (uuid) — nullable for events fired before a system is identified
	systemId: uuid('system_id'),

	// First 8 chars of the API key involved — logged on rotation only.
	// NEVER the raw key, NEVER the hash.
	keyPrefix: varchar('key_prefix', { length: 16 }),

	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),

	// Arbitrary structured metadata for the event
	details: jsonb('details'),

	createdAt: timestamp('created_at', { withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type SecurityAuditLog = typeof securityAuditLog.$inferSelect;
export type NewSecurityAuditLog = typeof securityAuditLog.$inferInsert;
