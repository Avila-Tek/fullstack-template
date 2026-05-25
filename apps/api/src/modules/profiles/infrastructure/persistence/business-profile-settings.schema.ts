import {
	boolean,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';
import { businessProfile } from './business-profile.schema';
import { unitOfMeasureMaster } from './unit-of-measure-master.schema';

export const businessProfileSettings = pgTable(
	'business_profile_settings',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessProfileId: uuid('business_profile_id')
			.notNull()
			.references(() => businessProfile.id),
		printGuide: boolean('print_guide').notNull().default(false),
		printQrLabel: boolean('print_qr_label').notNull().default(false),
		internationalMaritimeWeightUnitId: uuid(
			'international_maritime_weight_unit_id',
		)
			.notNull()
			.references(() => unitOfMeasureMaster.id),
		internationalMaritimeDimensionUnitId: uuid(
			'international_maritime_dimension_unit_id',
		)
			.notNull()
			.references(() => unitOfMeasureMaster.id),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		uniqueIndex('uq_business_profile_settings_business_profile_id').on(
			t.businessProfileId,
		),
	],
);

export type BusinessProfileSettingsRow =
	typeof businessProfileSettings.$inferSelect;
export type NewBusinessProfileSettingsRow =
	typeof businessProfileSettings.$inferInsert;
