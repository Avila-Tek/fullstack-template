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
import { address } from './address.schema';
import { customerTypeMaster } from './customer-type-master.schema';
import { documentTypeMaster } from './document-type-master.schema';
import { phonePrefixMaster } from './phone-prefix-master.schema';

export const coreStatusEnum = pgEnum('core_status', ['active', 'inactive']);

export const businessAccount = pgTable(
	'business_account',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		coreClientCode: varchar('core_client_code', { length: 50 }).notNull(),
		coreClientStatus: coreStatusEnum('core_client_status')
			.notNull()
			.default('active'),

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
		phoneNumber: varchar('phone_number', { length: 20 }),
		email: varchar('email', { length: 320 }),
		billingAddressId: uuid('billing_address_id').references(() => address.id),

		status: coreStatusEnum('status').notNull().default('active'),
		customerTypeId: uuid('customer_type_id').references(
			() => customerTypeMaster.id,
		),

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
		uniqueIndex('uq_business_account_core_client_code')
			.on(t.coreClientCode)
			.where(sql`${t.isDeleted} = false`),
		uniqueIndex('uq_business_account_document')
			.on(t.documentTypeId, t.documentNumber)
			.where(sql`${t.isDeleted} = false`),
		index('ix_business_account_status').on(t.status),
		index('ix_business_account_customer_type_id').on(t.customerTypeId),
	],
);

export type BusinessAccountRow = typeof businessAccount.$inferSelect;
export type NewBusinessAccountRow = typeof businessAccount.$inferInsert;
