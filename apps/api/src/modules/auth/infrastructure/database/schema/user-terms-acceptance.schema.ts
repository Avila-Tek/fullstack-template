import {
	customType,
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';

// PostgreSQL `inet` has no native Drizzle mapping — use a custom type.
// Application code always treats ip_address as a plain string.
const inet = customType<{ data: string }>({
	dataType() {
		return 'inet';
	},
});

export const userTermsAcceptance = pgTable(
	'user_terms_acceptance',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		// FK → user.id — Better Auth uses text PKs
		userId: text('user_id').notNull(),
		// FK → system.id — uuid
		systemId: uuid('system_id').notNull(),
		// FK → system_terms.id — uuid
		systemTermsId: uuid('system_terms_id').notNull(),
		// FK → session.id — Better Auth uses text PKs; null at signup time
		sessionId: text('session_id'),
		ipAddress: inet('ip_address'), // nullable — may be unavailable behind proxies
		userAgent: text('user_agent'), // nullable
		acceptedAt: timestamp('accepted_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(t) => [
		uniqueIndex('uq_user_terms_acceptance').on(
			t.userId,
			t.systemId,
			t.systemTermsId,
		),
		index('ix_user_terms_user_system_accepted').on(
			t.userId,
			t.systemId,
			t.acceptedAt,
		),
	],
);

export type UserTermsAcceptance = typeof userTermsAcceptance.$inferSelect;
export type NewUserTermsAcceptance = typeof userTermsAcceptance.$inferInsert;
