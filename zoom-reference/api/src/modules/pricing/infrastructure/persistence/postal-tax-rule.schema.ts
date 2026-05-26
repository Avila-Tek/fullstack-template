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

export const postalTaxRule = pgTable(
	'postal_tax_rule',
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
		taxAmount: numeric('tax_amount', { precision: 14, scale: 2 }).notNull(),
		weightTypeCode: integer('weight_type_code').notNull(),
		shippingServiceId: uuid('shipping_service_id')
			.notNull()
			.references(() => shippingServiceMaster.id),
		zoneCode: integer('zone_code'),
		percentage: numeric('percentage', { precision: 9, scale: 6 }),
		percentageWeight: numeric('percentage_weight', { precision: 10, scale: 3 }),
		effectiveAt: timestamp('effective_at', {
			mode: 'date',
			withTimezone: true,
		}),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }),
	},
	(t) => [
		index('ix_postal_tax_rule_shipping_service_id').on(t.shippingServiceId),
		index('ix_postal_tax_rule_effective_at').on(t.effectiveAt),
		index('ix_postal_tax_rule_is_active').on(t.isActive),
	],
);

export type PostalTaxRuleRow = typeof postalTaxRule.$inferSelect;
export type NewPostalTaxRuleRow = typeof postalTaxRule.$inferInsert;
