import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { user } from './user.schema';

// Better Auth core session table (spec §11 — single active session per user)
export const session = pgTable('session', {
	id: text('id').primaryKey(),
	expiresAt: timestamp('expires_at', {
		mode: 'date',
		withTimezone: true,
	}).notNull(),
	token: text('token').notNull().unique(),
	createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
});

export type Session = typeof session.$inferSelect;
export type NewSession = typeof session.$inferInsert;
