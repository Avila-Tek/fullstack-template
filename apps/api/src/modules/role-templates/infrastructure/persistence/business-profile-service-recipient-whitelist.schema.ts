import { index, pgTable, uniqueIndex, uuid } from 'drizzle-orm/pg-core';
import { businessProfileService } from './business-profile-service.schema';

export const businessProfileServiceRecipientWhitelist = pgTable(
	'business_profile_service_recipient_whitelist',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessProfileServiceId: uuid('business_profile_service_id')
			.notNull()
			.references(() => businessProfileService.id),
		// Cross-module ref to recipient.id — no FK constraint enforced here;
		// FK enforcement is handled at the application layer.
		recipientId: uuid('recipient_id').notNull(),
	},
	(t) => [
		uniqueIndex(
			'uq_business_profile_service_recipient_whitelist_bps_id_recipient_id',
		).on(t.businessProfileServiceId, t.recipientId),
		index('ix_business_profile_service_recipient_whitelist_recipient_id').on(
			t.recipientId,
		),
	],
);

export type BusinessProfileServiceRecipientWhitelistRow =
	typeof businessProfileServiceRecipientWhitelist.$inferSelect;
export type NewBusinessProfileServiceRecipientWhitelistRow =
	typeof businessProfileServiceRecipientWhitelist.$inferInsert;
