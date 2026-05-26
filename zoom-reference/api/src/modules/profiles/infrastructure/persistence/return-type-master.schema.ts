import {
	boolean,
	index,
	integer,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { statusMaster } from './status-master.schema';

export const returnTypeMaster = pgTable(
	'return_type_master',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		legacyId: integer('legacy_id').notNull().unique(),
		name: varchar('name', { length: 100 }).notNull(),
		finalStatusId: uuid('final_status_id').references(() => statusMaster.id),
		returnMode: integer('return_mode'),
		statusCode: varchar('status_code', { length: 30 }),
		templateCode: integer('template_code'),
		serviceCode: varchar('service_code', { length: 30 }),
		isWebVisible: boolean('is_web_visible').notNull().default(false),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		index('ix_return_type_master_name').on(t.name),
		index('ix_return_type_master_final_status_id').on(t.finalStatusId),
		index('ix_return_type_master_is_active').on(t.isActive),
	],
);

export type ReturnTypeMasterRow = typeof returnTypeMaster.$inferSelect;
export type NewReturnTypeMasterRow = typeof returnTypeMaster.$inferInsert;
