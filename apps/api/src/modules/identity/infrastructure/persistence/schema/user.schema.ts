import {
	boolean,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
} from 'drizzle-orm/pg-core';

// Better Auth core user table + custom columns required by spec
export const user = pgTable(
	'user',
	{
		// --- Better Auth core ---
		id: text('id').primaryKey(),
		email: text('email').notNull().unique(),
		emailVerified: boolean('email_verified').notNull().default(false),
		image: text('image'),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),

		// --- Custom columns (spec §3, §4, §10) ---
		// Normalized form of email: trim(lowercase(email)) — enforces one canonical identity per address
		normalizedEmail: text('normalized_email').notNull(),
		twoFactorEnabled: boolean('two_factor_enabled').notNull().default(false),

		// Spec §2: T&C version accepted at registration — required for compliance audit
		termsAcceptedVersion: text('terms_accepted_version').notNull().default(''),
		termsAcceptedAt: timestamp('terms_accepted_at', {
			mode: 'date',
			withTimezone: true,
		})
			.notNull()
			.defaultNow(),
	},
	(table) => [
		uniqueIndex('uq_user_normalized_email').on(table.normalizedEmail),
	],
);

export type User = typeof user.$inferSelect;
export type NewUser = typeof user.$inferInsert;
