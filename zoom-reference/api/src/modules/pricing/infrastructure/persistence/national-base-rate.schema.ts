import {
	boolean,
	index,
	integer,
	numeric,
	pgTable,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core';
import { shippingServiceMaster } from '../../../catalog/infrastructure/persistence/shipping-service-master.schema';
import { countryMaster } from '../../../region/infrastructure/persistence/country-master.schema';

export const nationalBaseRate = pgTable(
	'national_base_rate',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		legacyId: integer('legacy_id').notNull().unique(),
		minWeightKg: numeric('min_weight_kg', {
			precision: 10,
			scale: 3,
		}).notNull(),
		maxWeightKg: numeric('max_weight_kg', {
			precision: 10,
			scale: 3,
		}).notNull(),
		baseAmount: numeric('base_amount', {
			precision: 14,
			scale: 2,
		}).notNull(),
		shippingServiceId: uuid('shipping_service_id')
			.notNull()
			.references(() => shippingServiceMaster.id),
		weightTypeCode: integer('weight_type_code').notNull(),
		discountCode: integer('discount_code'),
		transitDays: integer('transit_days'),
		minQuantity: integer('min_quantity'),
		maxQuantity: integer('max_quantity'),
		discountPercentage: numeric('discount_percentage', {
			precision: 9,
			scale: 6,
		}),
		baseTypeCode: integer('base_type_code'),
		countryId: uuid('country_id')
			.notNull()
			.references(() => countryMaster.id),
		fpoFactor: integer('fpo_factor'),
		currencyTypeCode: integer('currency_type_code'),
		effectiveAt: timestamp('effective_at', {
			mode: 'date',
			withTimezone: true,
		}),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', {
			mode: 'date',
			withTimezone: true,
		}).$onUpdate(() => new Date()),
	},
	(t) => [
		index('ix_national_base_rate_shipping_service_id').on(t.shippingServiceId),
		index('ix_national_base_rate_country_id').on(t.countryId),
		index('ix_national_base_rate_effective_at').on(t.effectiveAt),
		index('ix_national_base_rate_is_active').on(t.isActive),
	],
);

export type NationalBaseRateRow = typeof nationalBaseRate.$inferSelect;
export type NewNationalBaseRateRow = typeof nationalBaseRate.$inferInsert;
