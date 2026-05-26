import {
	boolean,
	index,
	integer,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { municipalityMaster } from './municipality-master.schema';

export const parishMaster = pgTable(
	'parish_master',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		legacyId: integer('legacy_id').notNull().unique(),
		externalCode: varchar('external_code', { length: 6 }),
		municipalityId: uuid('municipality_id')
			.notNull()
			.references(() => municipalityMaster.id),
		name: varchar('name', { length: 140 }).notNull(),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }),
	},
	(t) => [
		index('ix_parish_master_municipality_name').on(t.municipalityId, t.name),
		uniqueIndex('uq_parish_master_municipality_external_code').on(
			t.municipalityId,
			t.externalCode,
		),
		index('ix_parish_master_is_active').on(t.isActive),
	],
);

export type ParishMasterRow = typeof parishMaster.$inferSelect;
