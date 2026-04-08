import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './user.schema';

// Stores pending email-change requests until the user clicks the confirmation link.
// One row per pending request; deleted when consumed or expired.
export const emailChangeVerification = pgTable('email_change_verification', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	// The new email address the user wants to switch to
	newEmail: text('new_email').notNull(),
	// HMAC token sent in the confirmation email
	token: text('token').notNull().unique(),
	expiresAt: timestamp('expires_at', {
		mode: 'date',
		withTimezone: true,
	}).notNull(),
	createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type EmailChangeVerification =
	typeof emailChangeVerification.$inferSelect;
export type NewEmailChangeVerification =
	typeof emailChangeVerification.$inferInsert;
