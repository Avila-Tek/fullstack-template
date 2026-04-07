import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';
import { user } from './user.schema';

// Better Auth core account table — one row per (user, provider) pair
// Spec §3: providers are password | google | apple | facebook
// Spec §9 (credential immutability): rows are inserted but never deleted via product flows
export const account = pgTable(
	'account',
	{
		id: text('id').primaryKey(),
		// Provider-specific user identifier (e.g. Google sub claim)
		accountId: text('account_id').notNull(),
		// Provider name: "password" | "google" | "apple" | "facebook"
		providerId: text('provider_id').notNull(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		accessToken: text('access_token'),
		refreshToken: text('refresh_token'),
		idToken: text('id_token'),
		accessTokenExpiresAt: timestamp('access_token_expires_at', {
			mode: 'date',
			withTimezone: true,
		}),
		refreshTokenExpiresAt: timestamp('refresh_token_expires_at', {
			mode: 'date',
			withTimezone: true,
		}),
		scope: text('scope'),
		// Argon2id hash stored here for password provider; null for OAuth providers
		password: text('password'),
		// Email as returned by the OAuth provider — used for account linking (spec §7)
		providerEmail: text('provider_email'),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(table) => [
		// Spec §3: UNIQUE(provider, provider_account_id)
		uniqueIndex('uq_account_provider_account_id').on(
			table.providerId,
			table.accountId,
		),
	],
);

export type Account = typeof account.$inferSelect;
export type NewAccount = typeof account.$inferInsert;
