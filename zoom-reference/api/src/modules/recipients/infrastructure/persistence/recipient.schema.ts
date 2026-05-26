import {
	boolean,
	index,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { encryptedText } from '../../../../infrastructure/database/encrypted-text';
import { address } from '../../../profiles/infrastructure/persistence/address.schema';
import { businessAccount } from '../../../profiles/infrastructure/persistence/business-account.schema';
import { businessProfile } from '../../../profiles/infrastructure/persistence/business-profile.schema';
import { documentTypeMaster } from '../../../profiles/infrastructure/persistence/document-type-master.schema';
import { phonePrefixMaster } from '../../../profiles/infrastructure/persistence/phone-prefix-master.schema';
import {
	recipientTypeEnum,
	shippingScopeEnum,
} from '../../../profiles/infrastructure/persistence/shipping-service-enums.schema';

export const recipientStatusEnum = pgEnum('recipient_status', [
	'active',
	'suspended',
]);

export const recipient = pgTable(
	'recipient',
	{
		id: uuid('id').primaryKey().defaultRandom(),

		businessAccountId: uuid('business_account_id')
			.notNull()
			.references(() => businessAccount.id),
		ownerBusinessProfileId: uuid('owner_business_profile_id').references(
			() => businessProfile.id,
		),
		isBusinessAccountOwner: boolean('is_business_account_owner')
			.notNull()
			.default(false),

		alias: varchar('alias', { length: 150 }),
		deliveryType: recipientTypeEnum('recipient_type').notNull(),
		serviceScope: shippingScopeEnum('service_scope').notNull(),
		status: recipientStatusEnum('status').notNull().default('active'),

		name: varchar('name', { length: 150 }).notNull(),
		contactName: varchar('contact_name', { length: 150 }),

		documentTypeId: uuid('document_type_id').references(
			() => documentTypeMaster.id,
		),
		documentType: varchar('document_type', { length: 5 }),
		documentNumber: encryptedText('document_number'),
		internationalDocument: encryptedText('international_document'),

		cellphonePrefixId: uuid('cellphone_prefix_id').references(
			() => phonePrefixMaster.id,
		),
		cellphonePrefix: varchar('cellphone_prefix', { length: 10 }),
		cellphoneNumber: encryptedText('cellphone_number'),

		phonePrefixId: uuid('phone_prefix_id').references(
			() => phonePrefixMaster.id,
		),
		phonePrefix: varchar('phone_prefix', { length: 10 }),
		phoneNumber: encryptedText('phone_number'),

		internationalCellphonePrefixId: uuid(
			'international_cellphone_prefix_id',
		).references(() => phonePrefixMaster.id),
		internationalCellphonePrefix: varchar('international_cellphone_prefix', {
			length: 10,
		}),
		internationalPhonePrefixId: uuid(
			'international_phone_prefix_id',
		).references(() => phonePrefixMaster.id),
		internationalPhonePrefix: varchar('international_phone_prefix', {
			length: 10,
		}),

		email: encryptedText('email'),

		addressId: uuid('address_id')
			.unique()
			.references(() => address.id),
		locality: text('locality'),
		observation: text('notes'),

		lockerMasterId: uuid('locker_master_id'),
		lockerPrefix: varchar('locker_prefix', { length: 20 }),
		lockerCode: varchar('locker_code', { length: 30 }),

		isDeleted: boolean('is_deleted').notNull().default(false),
		deletedByUserId: uuid('deleted_by_user_id'),
		deletedAt: timestamp('deleted_at', { mode: 'date', withTimezone: true }),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		index('ix_recipient_business_recipient_type_status').on(
			t.businessAccountId,
			t.deliveryType,
			t.status,
		),
		index('ix_recipient_business_owner_profile').on(
			t.businessAccountId,
			t.ownerBusinessProfileId,
		),
		index('ix_recipient_locker_master_id').on(t.lockerMasterId),
	],
);

export type RecipientRow = typeof recipient.$inferSelect;
export type NewRecipientRow = typeof recipient.$inferInsert;
