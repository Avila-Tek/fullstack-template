import {
	boolean,
	index,
	integer,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

export const customerTypeMaster = pgTable(
	'customer_type_master',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		legacyId: integer('legacy_id').notNull().unique(),
		name: varchar('name', { length: 80 }).notNull(),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }),
	},
	(t) => [
		index('ix_customer_type_master_name').on(t.name),
		index('ix_customer_type_master_is_active').on(t.isActive),
	],
);

export type CustomerTypeMasterRow = typeof customerTypeMaster.$inferSelect;
