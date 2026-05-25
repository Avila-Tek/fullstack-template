import {
	boolean,
	date,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';
import { shippingServiceMaster } from '../../../catalog/infrastructure/persistence/shipping-service-master.schema';
import { businessAccount } from './business-account.schema';
import { officeMaster } from './office-master.schema';

export const lockerMaster = pgTable(
	'locker_master',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		legacyId: integer('legacy_id').notNull().unique(),
		coreClientCode: varchar('core_client_code', { length: 50 }),
		daysCount: integer('days_count'),
		observations: text('observations'),
		contactName: varchar('contact_name', { length: 150 }),
		isTaxExempt: boolean('is_tax_exempt').notNull().default(false),
		isInternal: boolean('is_internal').notNull().default(false),
		deactivatedAt: timestamp('deactivated_at', {
			mode: 'date',
			withTimezone: true,
		}),
		legacyGlobalLockerId: integer('legacy_global_locker_id'),
		legacyGlobalCode: integer('legacy_global_code'),
		legacyGlobalClientId: integer('legacy_global_client_id'),
		createdByLegacyUserId: integer('created_by_legacy_user_id'),
		legacyDate: date('legacy_date'),
		legacyUpdatedDate: date('legacy_updated_date'),
		isDeleted: boolean('is_deleted').notNull().default(false),
		deletedAt: timestamp('deleted_at', { mode: 'date', withTimezone: true }),
		officeMasterId: uuid('office_master_id')
			.notNull()
			.references(() => officeMaster.id),
		shippingServiceMasterId: uuid('shipping_service_master_id').references(
			() => shippingServiceMaster.id,
		),
		// Cross-schema ref to business_account — same DB, no FK constraint issue
		businessAccountId: uuid('business_account_id').references(
			() => businessAccount.id,
		),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow(),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true })
			.notNull()
			.defaultNow()
			.$onUpdate(() => new Date()),
	},
	(t) => [
		index('ix_locker_master_office_master_id').on(t.officeMasterId),
		index('ix_locker_master_shipping_service_master_id').on(
			t.shippingServiceMasterId,
		),
		index('ix_locker_master_business_account_id').on(t.businessAccountId),
		index('ix_locker_master_core_client_code').on(t.coreClientCode),
		index('ix_locker_master_business_account_active').on(
			t.businessAccountId,
			t.isActive,
		),
		index('ix_locker_master_is_deleted').on(t.isDeleted),
	],
);

export type LockerMasterRow = typeof lockerMaster.$inferSelect;
export type NewLockerMasterRow = typeof lockerMaster.$inferInsert;
