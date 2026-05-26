import {
	boolean,
	integer,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

export const countryMaster = pgTable('country_master', {
	id: uuid('id').primaryKey().defaultRandom(),
	legacyId: integer('legacy_id').notNull().unique(),
	isoCode: varchar('iso_code', { length: 3 }),
	name: varchar('name', { length: 80 }).notNull(),
	capital: varchar('capital', { length: 120 }),
	zoneCode: integer('zone_code'),
	zoneMia: integer('zone_mia'),
	collectTransportCharge: boolean('collect_transport_charge')
		.notNull()
		.default(false),
	deliveryTimeDays: integer('delivery_time_days'),
	maritimeTimeDays: integer('maritime_time_days'),
	languageType: integer('language_type'),
	internationalAreaCode: varchar('international_area_code', { length: 20 }),
	dhlName: varchar('dhl_name', { length: 120 }),
	isInactive: boolean('is_inactive').notNull().default(false),
	createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
		.notNull()
		.defaultNow(),
	updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
		.notNull()
		.defaultNow()
		.$onUpdate(() => new Date()),
});
