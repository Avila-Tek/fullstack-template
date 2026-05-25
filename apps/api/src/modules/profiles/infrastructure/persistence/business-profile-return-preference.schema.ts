import {
	index,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from 'drizzle-orm/pg-core';
import { address } from './address.schema';
import { businessProfile } from './business-profile.schema';
import { lockerMaster } from './locker-master.schema';
import { officeMaster } from './office-master.schema';
import { returnTypeMaster } from './return-type-master.schema';

export const returnToEnum = pgEnum('return_to_enum', ['address', 'office']);

export const businessProfileReturnPreference = pgTable(
	'business_profile_return_preference',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		businessProfileId: uuid('business_profile_id')
			.notNull()
			.references(() => businessProfile.id),
		returnTypeId: uuid('return_type_id')
			.notNull()
			.references(() => returnTypeMaster.id),
		returnTo: returnToEnum('return_to'),
		returnAddressId: uuid('return_address_id').references(() => address.id),
		returnOfficeId: uuid('return_office_id').references(() => officeMaster.id),
		lockerMasterId: uuid('locker_master_id').references(() => lockerMaster.id),
		notes: text('notes'),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		uniqueIndex('uq_business_profile_return_preference_business_profile_id').on(
			t.businessProfileId,
		),
		index('ix_business_profile_return_preference_return_type_id').on(
			t.returnTypeId,
		),
		index('ix_business_profile_return_preference_return_address_id').on(
			t.returnAddressId,
		),
		index('ix_business_profile_return_preference_return_office_id').on(
			t.returnOfficeId,
		),
		index('ix_business_profile_return_preference_locker_master_id').on(
			t.lockerMasterId,
		),
	],
);

export type BusinessProfileReturnPreferenceRow =
	typeof businessProfileReturnPreference.$inferSelect;
export type NewBusinessProfileReturnPreferenceRow =
	typeof businessProfileReturnPreference.$inferInsert;
