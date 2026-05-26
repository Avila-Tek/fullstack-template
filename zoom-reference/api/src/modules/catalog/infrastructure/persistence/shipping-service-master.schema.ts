import {
	type AnyPgColumn,
	boolean,
	index,
	integer,
	pgTable,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

export const shippingServiceMaster = pgTable(
	'shipping_service_master',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		legacyId: integer('legacy_id').notNull().unique(),
		name: varchar('name', { length: 120 }).notNull(),
		shortCode: varchar('short_code', { length: 20 }),
		secondaryShortCode: varchar('secondary_short_code', { length: 20 }),
		salesOrganization: varchar('sales_organization', { length: 60 }),
		isLockerService: boolean('is_locker_service'),
		requiresManifest: boolean('requires_manifest'),
		availableAtCounter: boolean('available_at_counter'),
		isNational: boolean('is_national'),
		inboundInternational: boolean('inbound_international'),
		outboundInternational: boolean('outbound_international'),
		supportsEffectiveness: boolean('supports_effectiveness'),
		initializeOnCreation: boolean('initialize_on_creation'),
		usesCorrelativePq: boolean('uses_correlative_pq'),
		usesTemplateGuide: boolean('uses_template_guide'),
		usesNationalBaseRate: boolean('uses_national_base_rate'),
		usesInternationalBaseRate: boolean('uses_international_base_rate'),
		usesNationalOverweight: boolean('uses_national_overweight'),
		usesInternationalOverweight: boolean('uses_international_overweight'),
		usesPostalTax: boolean('uses_postal_tax'),
		familyCode: integer('family_code'),
		pricingServiceId: uuid('pricing_service_id').references(
			(): AnyPgColumn => shippingServiceMaster.id,
		),
		serviceTypeCode: integer('service_type_code'),
		paymentTypeCode: integer('payment_type_code'),
		pricingFamilyTypeCode: integer('pricing_family_type_code'),
		serviceUsageTypeCode: integer('service_usage_type_code'),
		deliveryShortCode: varchar('delivery_short_code', { length: 30 }),
		guideCloseTypeCode: integer('guide_close_type_code'),
		migrationServiceLegacyId: integer('migration_service_legacy_id'),
		migratedAt: timestamp('migrated_at', { mode: 'date', withTimezone: true }),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', {
			mode: 'date',
			withTimezone: true,
		}).defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		index('ix_shipping_service_master_name').on(t.name),
		index('ix_shipping_service_master_pricing_service_id').on(
			t.pricingServiceId,
		),
		index('ix_shipping_service_master_is_active').on(t.isActive),
	],
);

export type ShippingServiceMasterRow =
	typeof shippingServiceMaster.$inferSelect;
export type NewShippingServiceMasterRow =
	typeof shippingServiceMaster.$inferInsert;
