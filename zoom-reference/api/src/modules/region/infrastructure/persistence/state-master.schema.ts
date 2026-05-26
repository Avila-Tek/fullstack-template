import {
	boolean,
	index,
	integer,
	numeric,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { countryMaster } from './country-master.schema';

export const stateMaster = pgTable(
	'state_master',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		legacyId: integer('legacy_id').notNull().unique(),
		externalCode: varchar('external_code', { length: 5 }),
		name: varchar('name', { length: 80 }).notNull(),
		shortCode: varchar('short_code', { length: 10 }),
		countryId: uuid('country_id')
			.notNull()
			.references(() => countryMaster.id),
		regionCode: integer('region_code'),
		urbanization: varchar('urbanization', { length: 120 }),
		bcvStateCode: integer('bcv_state_code'),
		ipostelStateCode: integer('ipostel_state_code'),
		latitude: numeric('latitude', { precision: 10, scale: 7 }),
		longitude: numeric('longitude', { precision: 10, scale: 7 }),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }),
	},
	(t) => [
		index('ix_state_master_country_name').on(t.countryId, t.name),
		index('ix_state_master_external_code').on(t.externalCode),
		index('ix_state_master_is_active').on(t.isActive),
	],
);

export type StateMasterRow = typeof stateMaster.$inferSelect;
