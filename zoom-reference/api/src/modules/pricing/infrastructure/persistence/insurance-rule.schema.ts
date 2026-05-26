import {
	boolean,
	index,
	integer,
	numeric,
	pgTable,
	timestamp,
	uuid,
} from 'drizzle-orm/pg-core';

export const insuranceRule = pgTable(
	'insurance_rule',
	{
		id: uuid('id').primaryKey().defaultRandom(),
		legacyId: integer('legacy_id').notNull().unique(),
		minDeclaredValueAmount: numeric('min_declared_value_amount', {
			precision: 14,
			scale: 2,
		}),
		maxDeclaredValueAmount: numeric('max_declared_value_amount', {
			precision: 14,
			scale: 2,
		}),
		fixedInsuranceAmount: numeric('fixed_insurance_amount', {
			precision: 14,
			scale: 2,
		}),
		percentageInsurance: numeric('percentage_insurance', {
			precision: 9,
			scale: 6,
		}),
		isKeyRule: boolean('is_key_rule'),
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
		index('ix_insurance_rule_effective_at').on(t.effectiveAt),
		index('ix_insurance_rule_is_active').on(t.isActive),
	],
);

export type InsuranceRuleRow = typeof insuranceRule.$inferSelect;
export type NewInsuranceRuleRow = typeof insuranceRule.$inferInsert;
