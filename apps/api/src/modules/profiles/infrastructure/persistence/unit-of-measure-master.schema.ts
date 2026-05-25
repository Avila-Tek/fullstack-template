import {
	boolean,
	index,
	integer,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

export const unitOfMeasureMaster = pgTable(
	'unit_of_measure_master',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		code: varchar('code', { length: 20 }).notNull().unique(),
		name: varchar('name', { length: 100 }).notNull(),
		unitTypeCode: integer('unit_type_code').notNull(),
		isActive: boolean('is_active').notNull().default(true),
		legacyId: integer('legacy_id'),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		index('ix_unit_of_measure_master_unit_type_code').on(t.unitTypeCode),
		index('ix_unit_of_measure_master_is_active').on(t.isActive),
	],
);

export type UnitOfMeasureMasterRow = typeof unitOfMeasureMaster.$inferSelect;
export type NewUnitOfMeasureMasterRow = typeof unitOfMeasureMaster.$inferInsert;
