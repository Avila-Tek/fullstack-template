import {
	boolean,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';
import { user } from './user.schema';

export const twoFactorMethodsEnum = pgEnum('two_factor_methods', [
	'sms',
	'totp',
	'email',
]);

export const userTwoFactor = pgTable(
	'user_two_factor',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		method: twoFactorMethodsEnum('method').notNull(),
		enabled: boolean('enabled').notNull().default(false),
		verifiedAt: timestamp('verified_at', {
			mode: 'date',
			withTimezone: true,
		}),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		// MANUALLY PATCHED in migration SQL: add WHERE "enabled" = true
		// Enforces at most one enabled 2FA method per user; disabled rows (history) are unrestricted.
		uniqueIndex('uq_user_two_factor_user_enabled').on(t.userId),
	],
);

export type UserTwoFactor = typeof userTwoFactor.$inferSelect;
export type NewUserTwoFactor = typeof userTwoFactor.$inferInsert;
