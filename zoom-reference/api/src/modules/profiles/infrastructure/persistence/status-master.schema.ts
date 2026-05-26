import { pgTable, timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export const statusMaster = pgTable('status_master', {
	id: uuid('id').primaryKey().defaultRandom(),
	code: varchar('code', { length: 50 }).notNull().unique(),
	name: varchar('name', { length: 100 }).notNull(),
	description: varchar('description', { length: 255 }),
	createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});

export type StatusMasterRow = typeof statusMaster.$inferSelect;
export type NewStatusMasterRow = typeof statusMaster.$inferInsert;
