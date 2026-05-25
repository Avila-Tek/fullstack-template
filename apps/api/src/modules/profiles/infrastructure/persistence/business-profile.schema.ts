import { sql } from 'drizzle-orm';
import {
	boolean,
	index,
	pgEnum,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { encryptedText } from '../../../../infrastructure/database/encrypted-text';
import { address } from './address.schema';
import { businessAccount } from './business-account.schema';
import { documentTypeMaster } from './document-type-master.schema';
import { phonePrefixMaster } from './phone-prefix-master.schema';
import { roleTemplate } from './role-template.schema';

export const businessProfileRoleEnum = pgEnum('business_profile_role', [
	'owner',
	'member',
]);
export const businessProfileStatusEnum = pgEnum('business_profile_status', [
	'active',
	'suspended',
	'invited',
]);

export const businessProfile = pgTable(
	'business_profile',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		slug: varchar('slug', { length: 120 }),

		// Personal identity fields (owner's details at onboarding time)
		documentTypeId: uuid('document_type_id')
			.notNull()
			.references(() => documentTypeMaster.id),
		documentType: varchar('document_type', { length: 5 }).notNull(),
		documentNumber: varchar('document_number', { length: 30 }).notNull(),
		firstName: varchar('first_name', { length: 100 }),
		lastName: varchar('last_name', { length: 100 }),
		legalName: varchar('legal_name', { length: 200 }),
		phonePrefixId: uuid('phone_prefix_id').references(
			() => phonePrefixMaster.id,
		),
		phonePrefix: varchar('phone_prefix', { length: 10 }),
		phoneNumber: encryptedText('phone_number'),
		email: varchar('email', { length: 320 }),
		billingAddressId: uuid('billing_address_id').references(() => address.id),

		// Membership
		businessAccountId: uuid('business_account_id')
			.notNull()
			.references(() => businessAccount.id),
		// Plain UUID — references user.id in apps/auth DB (cross-schema, no FK constraint)
		userId: uuid('user_id'),
		role: businessProfileRoleEnum('role').notNull().default('owner'),
		status: businessProfileStatusEnum('status').notNull().default('active'),
		roleTemplateId: uuid('role_template_id').references(() => roleTemplate.id),
		isCustomized: boolean('is_customized').notNull().default(false),

		// Invitation (null for self-registered owners)
		invitedByUserId: uuid('invited_by_user_id'),
		invitedAt: timestamp('invited_at', { mode: 'date', withTimezone: true }),
		acceptedAt: timestamp('accepted_at', { mode: 'date', withTimezone: true }),

		suspendedAt: timestamp('suspended_at', {
			mode: 'date',
			withTimezone: true,
		}),
		suspendedByUserId: uuid('suspended_by_user_id'),
		suspendedReason: varchar('suspended_reason', { length: 255 }),

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
		uniqueIndex('uq_business_profile_slug')
			.on(t.slug)
			.where(sql`${t.isDeleted} = false AND ${t.slug} IS NOT NULL`),
		uniqueIndex('uq_business_profile_user')
			.on(t.userId)
			.where(sql`${t.isDeleted} = false AND ${t.userId} IS NOT NULL`),
		uniqueIndex('uq_business_profile_business_user')
			.on(t.businessAccountId, t.userId)
			.where(sql`${t.isDeleted} = false`),
		index('ix_business_profile_business_status').on(
			t.businessAccountId,
			t.status,
		),
		index('ix_business_profile_business_role').on(t.businessAccountId, t.role),
		index('ix_business_profile_user_status').on(t.userId, t.status),
		index('ix_business_profile_business_account_id').on(t.businessAccountId),
	],
);

export type BusinessProfileRow = typeof businessProfile.$inferSelect;
export type NewBusinessProfileRow = typeof businessProfile.$inferInsert;
