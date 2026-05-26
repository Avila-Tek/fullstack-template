import {
	boolean,
	index,
	numeric,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { cityMaster } from '../../../region/infrastructure/persistence/city-master.schema';
import { countryMaster } from '../../../region/infrastructure/persistence/country-master.schema';
import { municipalityMaster } from '../../../region/infrastructure/persistence/municipality-master.schema';
import { parishMaster } from '../../../region/infrastructure/persistence/parish-master.schema';
import { postalCodeMaster } from '../../../region/infrastructure/persistence/postal-code-master.schema';
import { stateMaster } from '../../../region/infrastructure/persistence/state-master.schema';

export const address = pgTable(
	'address',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		rawQuery: text('raw_query'),
		formattedAddress: text('formatted_address').notNull(),
		addressLine1: text('address_line_1').notNull(),
		addressLine2: text('address_line_2'),
		suburbText: varchar('suburb_text', { length: 120 }),
		postalCodeText: varchar('postal_code_text', { length: 20 }),
		internationalCityText: varchar('international_city_text', { length: 150 }),
		countryId: uuid('country_id').references(() => countryMaster.id),
		countryCode: varchar('country_code', { length: 5 }),
		countryName: varchar('country_name', { length: 150 }),
		stateId: uuid('state_id').references(() => stateMaster.id),
		cityId: uuid('city_id').references(() => cityMaster.id),
		municipalityId: uuid('municipality_id').references(
			() => municipalityMaster.id,
		),
		parishId: uuid('parish_id').references(() => parishMaster.id),
		postalCodeId: uuid('postal_code_id').references(() => postalCodeMaster.id),
		geoLat: numeric('geo_lat', { precision: 10, scale: 7 }),
		geoLng: numeric('geo_lng', { precision: 10, scale: 7 }),
		geolocationProvider: varchar('geolocation_provider', { length: 50 }),
		providerAddressId: varchar('provider_address_id', { length: 50 }),
		providerRouteCode: varchar('provider_route_code', { length: 50 }),
		providerMatchType: varchar('provider_match_type', { length: 20 }),
		supportedByZoom: boolean('supported_by_zoom').notNull().default(false),
		validatedAt: timestamp('validated_at', {
			mode: 'date',
			withTimezone: true,
		}),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		index('ix_address_country_state_city').on(t.countryId, t.stateId, t.cityId),
		index('ix_address_postal_code_id').on(t.postalCodeId),
		index('ix_address_provider_address_id').on(t.providerAddressId),
		index('ix_address_provider_route_code').on(t.providerRouteCode),
		index('ix_address_supported_by_zoom').on(t.supportedByZoom),
	],
);

export type AddressRow = typeof address.$inferSelect;
export type NewAddressRow = typeof address.$inferInsert;
