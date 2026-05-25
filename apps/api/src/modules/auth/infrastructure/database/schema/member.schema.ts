import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Better Auth Organization member table — managed by the organization plugin.
// One row per (organization, user) pair. Role is controlled by Better Auth.
export const member = pgTable('member', {
	id: text('id').primaryKey(),
	organizationId: text('organization_id').notNull(),
	userId: text('user_id').notNull(),
	role: text('role').notNull().default('member'),
	createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
		.notNull()
		.defaultNow(),
});

export type Member = typeof member.$inferSelect;
export type NewMember = typeof member.$inferInsert;
