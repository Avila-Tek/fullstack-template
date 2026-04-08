import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Better Auth core verification table — stores email verification + password reset tokens
export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	// The address or identifier the verification was sent to
	identifier: text('identifier').notNull(),
	// Hashed token value
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at', {
		mode: 'date',
		withTimezone: true,
	}).notNull(),
	createdAt: timestamp('created_at', {
		mode: 'date',
		withTimezone: true,
	}).defaultNow(),
	updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
		.defaultNow()
		.$onUpdate(() => new Date()),
});

export type Verification = typeof verification.$inferSelect;
export type NewVerification = typeof verification.$inferInsert;
