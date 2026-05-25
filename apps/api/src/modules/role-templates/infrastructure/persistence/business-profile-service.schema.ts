import {
	boolean,
	index,
	pgTable,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';
import { shippingServiceMaster } from '../../../catalog/infrastructure/persistence/shipping-service-master.schema';
import { businessProfile } from '../../../profiles/infrastructure/persistence/business-profile.schema';
import {
	paymentTypeEnum,
	recipientTypeEnum,
	shippingScopeEnum,
	shippingServiceKeyEnum,
} from '../../../profiles/infrastructure/persistence/shipping-service-enums.schema';

export const businessProfileService = pgTable(
	'business_profile_service',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessProfileId: uuid('business_profile_id')
			.notNull()
			.references(() => businessProfile.id),
		key: shippingServiceKeyEnum('key').notNull(),
		shippingScope: shippingScopeEnum('shipping_scope').notNull(),
		recipientType: recipientTypeEnum('recipient_type'),
		paymentType: paymentTypeEnum('payment_type'),
		shippingServiceId: uuid('shipping_service_id').references(
			() => shippingServiceMaster.id,
		),
		enabled: boolean('enabled').notNull().default(true),
		whitelistEnabled: boolean('whitelist_enabled').notNull().default(false),
	},
	(t) => [
		uniqueIndex('uq_business_profile_service_business_profile_id_key').on(
			t.businessProfileId,
			t.key,
		),
		index('ix_business_profile_service_business_profile_id_enabled').on(
			t.businessProfileId,
			t.enabled,
		),
		index(
			'ix_business_profile_service_business_profile_id_whitelist_enabled',
		).on(t.businessProfileId, t.whitelistEnabled),
	],
);

export type BusinessProfileServiceRow =
	typeof businessProfileService.$inferSelect;
export type NewBusinessProfileServiceRow =
	typeof businessProfileService.$inferInsert;
