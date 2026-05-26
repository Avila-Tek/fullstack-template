import {
	boolean,
	index,
	integer,
	numeric,
	pgTable,
	text,
	time,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { cityMaster } from '../../../region/infrastructure/persistence/city-master.schema';

export const officeMaster = pgTable(
	'office_master',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		legacyId: integer('legacy_id').notNull().unique(),
		name: varchar('name', { length: 150 }).notNull(),
		shortCode: varchar('short_code', { length: 30 }),
		address: text('address'),
		phone1: varchar('phone_1', { length: 40 }),
		phone2: varchar('phone_2', { length: 40 }),
		email: varchar('email', { length: 320 }),
		fax: varchar('fax', { length: 40 }),
		cityId: uuid('city_id').references(() => cityMaster.id),
		officeTypeCode: integer('office_type_code'),
		stationCode: integer('station_code'),
		legalName: varchar('legal_name', { length: 255 }),
		localCode: varchar('local_code', { length: 50 }),
		customerCode: varchar('customer_code', { length: 50 }),
		providerCode: integer('provider_code'),
		partnerCustomerCode: varchar('partner_customer_code', { length: 50 }),
		latitude: numeric('latitude', { precision: 10, scale: 7 }),
		longitude: numeric('longitude', { precision: 10, scale: 7 }),
		pickupCutoffTime: time('pickup_cutoff_time'),
		estimatedDeliveryTime: time('estimated_delivery_time'),
		supportsCod: boolean('supports_cod'),
		isOperatingStation: boolean('is_operating_station'),
		isManifestOffice: boolean('is_manifest_office'),
		isFastManifestOffice: boolean('is_fast_manifest_office'),
		isRouteOffice: boolean('is_route_office'),
		isCdo: boolean('is_cdo'),
		isSystemOffice: boolean('is_system_office'),
		isProvidence: boolean('is_providence'),
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
		index('ix_office_master_city_id').on(t.cityId),
		index('ix_office_master_short_code').on(t.shortCode),
		index('ix_office_master_is_active').on(t.isActive),
	],
);

export type OfficeMasterRow = typeof officeMaster.$inferSelect;
export type NewOfficeMasterRow = typeof officeMaster.$inferInsert;
