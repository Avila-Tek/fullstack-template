import { bigint, index, integer, pgTable, text } from 'drizzle-orm/pg-core';

// Better Auth rate limit table — required when rateLimit.storage = "database".
// The Drizzle adapter expects an `id` primary key on every table it manages.
export const rateLimit = pgTable(
	'rate_limit',
	{
		id: text('id').primaryKey(),
		key: text('key'),
		count: integer('count').notNull(),
		lastRequest: bigint('last_request', { mode: 'number' }).notNull(),
	},
	(table) => [index('idx_rate_limit_key').on(table.key)],
);

export type RateLimit = typeof rateLimit.$inferSelect;
export type NewRateLimit = typeof rateLimit.$inferInsert;
