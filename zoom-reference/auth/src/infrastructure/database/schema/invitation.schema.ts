import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

// Better Auth Organization invitation table — managed by the organization plugin.
// S-010 does not send invitations; this table is required for the plugin to initialise.
export const invitation = pgTable('invitation', {
	id: text('id').primaryKey(),
	organizationId: text('organization_id').notNull(),
	email: text('email').notNull(),
	role: text('role').notNull(),
	status: text('status').notNull().default('pending'),
	expiresAt: timestamp('expires_at', { mode: 'date', withTimezone: true }),
	createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
		.notNull()
		.defaultNow(),
	// FK → user.id (Better Auth text PK)
	inviterId: text('inviter_id').notNull(),
});

export type Invitation = typeof invitation.$inferSelect;
export type NewInvitation = typeof invitation.$inferInsert;
