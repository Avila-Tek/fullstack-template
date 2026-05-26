import {
	boolean,
	index,
	integer,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { cityMaster } from './city-master.schema';
import { municipalityMaster } from './municipality-master.schema';
import { parishMaster } from './parish-master.schema';
import { stateMaster } from './state-master.schema';

export const postalCodeMaster = pgTable(
	'postal_code_master',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		legacyId: integer('legacy_id').notNull().unique(),
		postalCode: varchar('postal_code', { length: 10 }).notNull(),
		stateId: uuid('state_id').references(() => stateMaster.id),
		municipalityId: uuid('municipality_id').references(
			() => municipalityMaster.id,
		),
		cityId: uuid('city_id').references(() => cityMaster.id),
		parishId: uuid('parish_id').references(() => parishMaster.id),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }),
	},
	(t) => [
		index('ix_postal_code_master_postal_code').on(t.postalCode),
		index('ix_postal_code_master_geo').on(
			t.stateId,
			t.municipalityId,
			t.cityId,
			t.parishId,
		),
		index('ix_postal_code_master_is_active').on(t.isActive),
	],
);

export type PostalCodeMasterRow = typeof postalCodeMaster.$inferSelect;
