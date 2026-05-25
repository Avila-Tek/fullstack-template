import { pgTable, text, timestamp, uniqueIndex } from 'drizzle-orm/pg-core';

// Better Auth Organization table — created and managed by the organization plugin.
// Each system (tenant) registered in S-010 has one corresponding Organization record.
export const organization = pgTable(
	'organization',
	{
		// Better Auth uses text IDs for all its core tables
		id: text('id').primaryKey(),
		name: text('name').notNull(),
		slug: text('slug').notNull(),
		logo: text('logo'),
		// JSON metadata blob — stored as text, not jsonb, to match BA's expectation
		metadata: text('metadata'),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', {
			mode: 'date',
			withTimezone: true,
		}).$onUpdate(() => new Date()),
	},
	(t) => [uniqueIndex('uq_organization_slug').on(t.slug)],
);

export type Organization = typeof organization.$inferSelect;
export type NewOrganization = typeof organization.$inferInsert;
