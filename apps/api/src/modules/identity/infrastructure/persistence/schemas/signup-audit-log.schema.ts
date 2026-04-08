import { pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Spec §2 / §21 — immutable sign-up audit trail; rows are inserted, never updated or deleted.
// userId is nullable because most events fire before the user row is committed.

export const signupEventTypeEnum = pgEnum('signup_event_type', [
	'signup_attempt',
	'signup_success',
	'signup_failure',
	'signup_duplicate_email',
	'signup_captcha_challenge',
	'signup_rate_limited',
	'signup_tc_version_unavailable',
	'signup_tc_version_mismatch',
]);

export const signupAuditLog = pgTable('signup_audit_log', {
	id: text('id').primaryKey(),
	correlationId: text('correlation_id').notNull(),
	eventType: signupEventTypeEnum('event_type').notNull(),
	ipHash: text('ip_hash').notNull(),
	userAgent: text('user_agent').notNull(),
	// Nullable — user row may not exist yet at the time of the event
	userId: text('user_id'),
	failureReason: text('failure_reason'),
	timestamp: timestamp('timestamp', { mode: 'date', withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type SignupAuditLog = typeof signupAuditLog.$inferSelect;
export type NewSignupAuditLog = typeof signupAuditLog.$inferInsert;
