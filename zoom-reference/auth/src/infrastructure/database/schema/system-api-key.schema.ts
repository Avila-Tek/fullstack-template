import {
	char,
	index,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

export const systemApiKey = pgTable(
	'system_api_key',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		// FK → system.id — no Drizzle FK constraint (consistent with project pattern)
		systemId: uuid('system_id').notNull(),
		// SHA-256 hex digest of the raw API key — exactly 64 hex characters
		keyHash: char('key_hash', { length: 64 }).notNull().unique(),
		// First 8 characters of the raw key — display only, never secret
		keyPrefix: varchar('key_prefix', { length: 16 }).notNull(),
		createdAt: timestamp('created_at', { withTimezone: true })
			.notNull()
			.defaultNow(),
		// NULL = active key; set to now() on rotation — never cleared once set
		revokedAt: timestamp('revoked_at', { withTimezone: true }),
	},
	(t) => [
		index('ix_system_api_key_system_id').on(t.systemId),
		index('ix_system_api_key_system_revoked_at').on(t.systemId, t.revokedAt),
	],
);

export type SystemApiKey = typeof systemApiKey.$inferSelect;
export type NewSystemApiKey = typeof systemApiKey.$inferInsert;
