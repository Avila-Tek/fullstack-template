import { index, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './user.schema';

// Spec §18 — retains last 5 Argon2id hashes to prevent password reuse
export const passwordHistory = pgTable(
	'password_history',
	{
		id: text('id').primaryKey(),
		userId: text('user_id')
			.notNull()
			.references(() => user.id, { onDelete: 'cascade' }),
		// Argon2id hash — never the plaintext password
		hashedPassword: text('hashed_password').notNull(),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
	},
	(table) => [index('idx_password_history_user_id').on(table.userId)],
);

export type PasswordHistory = typeof passwordHistory.$inferSelect;
export type NewPasswordHistory = typeof passwordHistory.$inferInsert;
