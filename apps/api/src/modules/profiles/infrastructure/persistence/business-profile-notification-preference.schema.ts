import {
	boolean,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';
import { businessProfile } from './business-profile.schema';

export const businessProfileNotificationPreference = pgTable(
	'business_profile_notification_preference',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessProfileId: uuid('business_profile_id')
			.notNull()
			.references(() => businessProfile.id),
		emailEnabled: boolean('email_enabled').notNull().default(true),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		uniqueIndex('uq_bp_notification_preference_bp_id').on(t.businessProfileId),
	],
);

export type BusinessProfileNotificationPreferenceRow =
	typeof businessProfileNotificationPreference.$inferSelect;
