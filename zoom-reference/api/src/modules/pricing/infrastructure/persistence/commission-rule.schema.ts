import {
	boolean,
	index,
	integer,
	numeric,
	pgTable,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core';

export const commissionRule = pgTable(
	'commission_rule',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		legacyId: integer('legacy_id').notNull().unique(),
		codPaymentModeId: uuid('cod_payment_mode_id'),
		modeType: integer('mode_type'),
		minAmount: numeric('min_amount', { precision: 14, scale: 2 }),
		maxAmount: numeric('max_amount', { precision: 14, scale: 2 }),
		fixedCommissionAmount: numeric('fixed_commission_amount', {
			precision: 14,
			scale: 2,
		}),
		percentageCommission: numeric('percentage_commission', {
			precision: 9,
			scale: 6,
		}),
		currencyTypeCode: integer('currency_type_code'),
		effectiveAt: timestamp('effective_at', {
			mode: 'date',
			withTimezone: true,
		}),
		isActive: boolean('is_active').notNull().default(true),
		createdAt: timestamp('created_at', { mode: 'date', withTimezone: true }),
		updatedAt: timestamp('updated_at', {
			mode: 'date',
			withTimezone: true,
		}).$onUpdate(() => new Date()),
	},
	(t) => [
		index('ix_commission_rule_cod_payment_mode_id').on(t.codPaymentModeId),
		index('ix_commission_rule_effective_at').on(t.effectiveAt),
		index('ix_commission_rule_is_active').on(t.isActive),
	],
);

export type CommissionRuleRow = typeof commissionRule.$inferSelect;
export type NewCommissionRuleRow = typeof commissionRule.$inferInsert;
