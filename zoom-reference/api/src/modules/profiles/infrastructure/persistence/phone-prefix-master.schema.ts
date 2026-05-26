import {
	boolean,
	index,
	integer,
	pgEnum,
	pgTable,
	timestamp,
	uniqueIndex,
	uuid,
	varchar,
} from 'drizzle-orm/pg-core';

export const phonePrefixScopeEnum = pgEnum('phone_prefix_scope', [
	'national',
	'international',
]);

export const phonePrefixMaster = pgTable(
	'phone_prefix_master',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		legacyId: integer('legacy_id').notNull().unique(),
		carrierName: varchar('carrier_name', { length: 100 }).notNull(),
		prefix: varchar('prefix', { length: 10 }).notNull(),
		prefixType: varchar('prefix_type', { length: 20 }),
		scope: phonePrefixScopeEnum('scope').notNull().default('national'),
		countryPrefix: varchar('country_prefix', { length: 10 }),
		countryIsoCode: varchar('country_iso_code', { length: 3 }),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }),
	},
	(t) => [
		index('ix_phone_prefix_master_carrier_name').on(t.carrierName),
		index('ix_phone_prefix_master_prefix').on(t.prefix),
		uniqueIndex('uq_phone_prefix_master_carrier_prefix').on(
			t.carrierName,
			t.prefix,
		),
		index('ix_phone_prefix_master_is_active').on(t.isActive),
		index('ix_phone_prefix_master_scope_is_active').on(t.scope, t.isActive),
	],
);

export type PhonePrefixMasterRow = typeof phonePrefixMaster.$inferSelect;
