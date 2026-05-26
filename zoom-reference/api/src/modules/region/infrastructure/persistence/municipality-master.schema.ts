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
import { stateMaster } from './state-master.schema';

export const municipalityMaster = pgTable(
	'municipality_master',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		legacyId: integer('legacy_id').notNull().unique(),
		externalCode: varchar('external_code', { length: 4 }),
		stateId: uuid('state_id')
			.notNull()
			.references(() => stateMaster.id),
		name: varchar('name', { length: 100 }).notNull(),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }),
	},
	(t) => [
		index('ix_municipality_master_state_name').on(t.stateId, t.name),
		uniqueIndex('uq_municipality_master_state_external_code').on(
			t.stateId,
			t.externalCode,
		),
		index('ix_municipality_master_is_active').on(t.isActive),
	],
);

export type MunicipalityMasterRow = typeof municipalityMaster.$inferSelect;
