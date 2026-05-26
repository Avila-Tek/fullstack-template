import {
	boolean,
	index,
	integer,
	numeric,
	pgTable,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core';

export const transportChargeRule = pgTable(
	'transport_charge_rule',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		legacyId: integer('legacy_id').notNull().unique(),
		amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
		currencyTypeCode: integer('currency_type_code'),
		effectiveAt: timestamp('effective_at', {
			mode: 'date',
			withTimezone: true,
		}),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }),
		updatedAt: timestamp('updated_at', { mode: 'date', withTimezone: true }),
	},
	(t) => [
		index('ix_transport_charge_rule_effective_at').on(t.effectiveAt),
		index('ix_transport_charge_rule_is_active').on(t.isActive),
	],
);

export type TransportChargeRuleRow = typeof transportChargeRule.$inferSelect;
