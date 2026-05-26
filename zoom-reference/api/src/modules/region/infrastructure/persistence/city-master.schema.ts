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
import { transportChargeRule } from '../../../pricing/infrastructure/persistence/transport-charge-rule.schema';
import { countryMaster } from './country-master.schema';
import { municipalityMaster } from './municipality-master.schema';
import { stateMaster } from './state-master.schema';

export const cityMaster = pgTable(
	'city_master',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		legacyId: integer('legacy_id').notNull().unique(),
		externalCode: varchar('external_code', { length: 5 }),
		name: varchar('name', { length: 120 }).notNull(),
		normalizedName: varchar('normalized_name', { length: 120 }),
		countryId: uuid('country_id')
			.notNull()
			.references(() => countryMaster.id),
		stateId: uuid('state_id')
			.notNull()
			.references(() => stateMaster.id),
		municipalityId: uuid('municipality_id').references(
			() => municipalityMaster.id,
		),
		// TODO: reference office table
		officeId: uuid('office_id'),
		operatingOfficeId: uuid('operating_office_id'),
		transportChargeRuleId: uuid('transport_charge_rule_id').references(
			() => transportChargeRule.id,
		),
		categoryCode: integer('category_code'),
		maxWeightKg: numeric('max_weight_kg', { precision: 10, scale: 3 }),
		supportsCod: boolean('supports_cod'),
		pickupAvailable: boolean('pickup_available'),
		paperDeliveryDisabled: boolean('paper_delivery_disabled'),
		ipostelCityCode: integer('ipostel_city_code'),
		rateTypeCode: integer('rate_type_code'),
		stationCode: integer('station_code'),
		nationalVatRate: numeric('national_vat_rate', { precision: 9, scale: 6 }),
		nationalSurchargeRate: numeric('national_surcharge_rate', {
			precision: 9,
			scale: 6,
		}),
		internationalVatRate: numeric('international_vat_rate', {
			precision: 9,
			scale: 6,
		}),
		internationalSurchargeRate: numeric('international_surcharge_rate', {
			precision: 9,
			scale: 6,
		}),
		latitude: numeric('latitude', { precision: 10, scale: 7 }),
		longitude: numeric('longitude', { precision: 10, scale: 7 }),
		frequencyMon: boolean('frequency_mon'),
		frequencyTue: boolean('frequency_tue'),
		frequencyWed: boolean('frequency_wed'),
		frequencyThu: boolean('frequency_thu'),
		frequencyFri: boolean('frequency_fri'),
		frequencySat: boolean('frequency_sat'),
		frequencySun: boolean('frequency_sun'),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }),
	},
	(t) => [
		index('ix_city_master_state_name').on(t.stateId, t.name),
		index('ix_city_master_external_code').on(t.externalCode),
		index('ix_city_master_office_id').on(t.officeId),
		index('ix_city_master_operating_office_id').on(t.operatingOfficeId),
		index('ix_city_master_is_active').on(t.isActive),
	],
);

export type CityMasterRow = typeof cityMaster.$inferSelect;
