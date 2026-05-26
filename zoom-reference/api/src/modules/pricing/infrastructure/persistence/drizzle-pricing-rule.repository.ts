import { Inject, Injectable } from '@nestjs/common';
import { and, desc, eq, gt, gte, isNull, lte, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { routeMaster } from '../../../catalog/infrastructure/persistence/route-master.schema';
import { shippingServiceMaster } from '../../../catalog/infrastructure/persistence/shipping-service-master.schema';
import {
	type CommissionRuleRow,
	type FindCommissionRuleQuery,
	type FindInsuranceBoundsQuery,
	type FindInsuranceRuleQuery,
	type FindNationalBaseRateCeilingQuery,
	type FindNationalBaseRateQuery,
	type FindOverweightRuleQuery,
	type FindPostalTaxRuleQuery,
	type FindRouteMaxWeightKgQuery,
	type FindTransportChargeRuleQuery,
	type InsuranceBounds,
	type InsuranceRuleRow,
	type NationalBaseRateRow,
	type OverweightRuleRow,
	type PostalTaxRuleRow,
	PricingRuleRepositoryPort,
	type TransportChargeRuleRow,
} from '../../application/ports/out/pricing-rule-repository.port';
import {
	resolveBaseTypeCode,
	resolveShippingServiceLegacyId,
} from '../../application/primitives/nacional-rate-type-codes';
import { commissionRule } from './commission-rule.schema';
import { insuranceRule } from './insurance-rule.schema';
import { nationalBaseRate } from './national-base-rate.schema';
import { nationalOverweightRule } from './national-overweight-rule.schema';
import { postalTaxRule } from './postal-tax-rule.schema';
import { transportChargeRule } from './transport-charge-rule.schema';

// ─── Row → entity mappers ───────────────────────────────────────────────────
//
// node-postgres returns Drizzle `numeric()` columns as strings to avoid IEEE
// 754 precision loss for arbitrary-precision values. The pricing primitives
// operate on JS `number` (the rule rates have ≤ 6 decimal places — well
// within `number` precision), so we coerce once at the repo boundary.
// Centralising the coercion here keeps the port DTOs honest (`number` means
// number) and prevents callers from forgetting `Number(...)` at each site.

interface RawOverweightRow {
	id: string;
	overweightAmount: string;
	minWeightKg: string;
	maxWeightKg: string;
	weightTypeCode: number;
	shippingServiceId: string;
	overweightTypeCode: number | null;
	effectiveAt: Date | null;
}

interface RawPostalTaxRow {
	id: string;
	minWeightKg: string;
	maxWeightKg: string;
	taxAmount: string;
	weightTypeCode: number;
	shippingServiceId: string;
	percentage: string | null;
	percentageWeight: string | null;
	effectiveAt: Date | null;
}

interface RawInsuranceRow {
	id: string;
	minDeclaredValueAmount: string | null;
	maxDeclaredValueAmount: string | null;
	fixedInsuranceAmount: string | null;
	percentageInsurance: string | null;
	effectiveAt: Date | null;
}

interface RawTransportChargeRow {
	id: string;
	amount: string;
	effectiveAt: Date | null;
}

interface RawNationalBaseRateRow {
	id: string;
	baseAmount: string;
	minWeightKg: string;
	maxWeightKg: string;
}

interface RawCommissionRuleRow {
	id: string;
	fixedCommissionAmount: string | null;
	percentageCommission: string | null;
}

const numOrNull = (v: string | null): number | null =>
	v === null ? null : Number(v);

function overweightRuleRowToEntity(row: RawOverweightRow): OverweightRuleRow {
	return {
		id: row.id,
		overweightAmount: Number(row.overweightAmount),
		minWeightKg: Number(row.minWeightKg),
		maxWeightKg: Number(row.maxWeightKg),
		weightTypeCode: row.weightTypeCode,
		shippingServiceId: row.shippingServiceId,
		overweightTypeCode: row.overweightTypeCode,
		effectiveAt: row.effectiveAt,
	};
}

function postalTaxRuleRowToEntity(row: RawPostalTaxRow): PostalTaxRuleRow {
	return {
		id: row.id,
		minWeightKg: Number(row.minWeightKg),
		maxWeightKg: Number(row.maxWeightKg),
		taxAmount: Number(row.taxAmount),
		weightTypeCode: row.weightTypeCode,
		shippingServiceId: row.shippingServiceId,
		percentage: numOrNull(row.percentage),
		percentageWeight: numOrNull(row.percentageWeight),
		effectiveAt: row.effectiveAt,
	};
}

function insuranceRuleRowToEntity(row: RawInsuranceRow): InsuranceRuleRow {
	return {
		id: row.id,
		minDeclaredValueAmount: numOrNull(row.minDeclaredValueAmount),
		maxDeclaredValueAmount: numOrNull(row.maxDeclaredValueAmount),
		fixedInsuranceAmount: numOrNull(row.fixedInsuranceAmount),
		percentageInsurance: numOrNull(row.percentageInsurance),
		effectiveAt: row.effectiveAt,
	};
}

function transportChargeRuleRowToEntity(
	row: RawTransportChargeRow,
): TransportChargeRuleRow {
	return {
		id: row.id,
		amount: Number(row.amount),
		effectiveAt: row.effectiveAt,
	};
}

function nationalBaseRateRowToEntity(
	row: RawNationalBaseRateRow,
): NationalBaseRateRow {
	return {
		id: row.id,
		baseAmount: Number(row.baseAmount),
		minWeightKg: Number(row.minWeightKg),
		maxWeightKg: Number(row.maxWeightKg),
	};
}

function commissionRuleRowToEntity(
	row: RawCommissionRuleRow,
): CommissionRuleRow {
	return {
		id: row.id,
		fixedCommissionAmount: numOrNull(row.fixedCommissionAmount),
		percentageCommission: numOrNull(row.percentageCommission),
	};
}

@Injectable()
export class DrizzlePricingRuleRepository implements PricingRuleRepositoryPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	// LEGACY: replaces PG function `funsobrepesonac_age`. Picks the most-recent
	// rule whose effective date is <= today, matching codservicio + weightTypeCode
	// + overweightTypeCode and whose [pesomin, pesomax] bracket contains the
	// overweightKilos input.
	async findOverweightRule(
		q: FindOverweightRuleQuery,
	): Promise<OverweightRuleRow | null> {
		const overweight = q.overweightKilos.toString();
		const rows = await this.db
			.select({
				id: nationalOverweightRule.id,
				overweightAmount: nationalOverweightRule.overweightAmount,
				minWeightKg: nationalOverweightRule.minWeightKg,
				maxWeightKg: nationalOverweightRule.maxWeightKg,
				weightTypeCode: nationalOverweightRule.weightTypeCode,
				shippingServiceId: nationalOverweightRule.shippingServiceId,
				overweightTypeCode: nationalOverweightRule.overweightTypeCode,
				effectiveAt: nationalOverweightRule.effectiveAt,
			})
			.from(nationalOverweightRule)
			.where(
				and(
					eq(nationalOverweightRule.shippingServiceId, q.shippingServiceId),
					eq(nationalOverweightRule.weightTypeCode, q.weightTypeCode),
					eq(nationalOverweightRule.overweightTypeCode, q.overweightTypeCode),
					eq(nationalOverweightRule.isActive, true),
					lte(nationalOverweightRule.minWeightKg, overweight),
					gte(nationalOverweightRule.maxWeightKg, overweight),
					lte(nationalOverweightRule.effectiveAt, q.today),
				),
			)
			.orderBy(desc(nationalOverweightRule.effectiveAt))
			.limit(1);
		const row = rows[0];
		return row ? overweightRuleRowToEntity(row) : null;
	}

	// LEGACY: replaces PG function `funfpo`. Most-recent active rule whose
	// effective date is <= today, matching codservicio + weightTypeCode and whose
	// [pesomin, pesomax] bracket contains weightGrams.
	async findPostalTaxRule(
		q: FindPostalTaxRuleQuery,
	): Promise<PostalTaxRuleRow | null> {
		const weight = q.weightGrams.toString();
		const rows = await this.db
			.select({
				id: postalTaxRule.id,
				minWeightKg: postalTaxRule.minWeightKg,
				maxWeightKg: postalTaxRule.maxWeightKg,
				taxAmount: postalTaxRule.taxAmount,
				weightTypeCode: postalTaxRule.weightTypeCode,
				shippingServiceId: postalTaxRule.shippingServiceId,
				percentage: postalTaxRule.percentage,
				percentageWeight: postalTaxRule.percentageWeight,
				effectiveAt: postalTaxRule.effectiveAt,
			})
			.from(postalTaxRule)
			.where(
				and(
					eq(postalTaxRule.shippingServiceId, q.shippingServiceId),
					eq(postalTaxRule.weightTypeCode, q.weightTypeCode),
					eq(postalTaxRule.isActive, true),
					lte(postalTaxRule.minWeightKg, weight),
					gte(postalTaxRule.maxWeightKg, weight),
					lte(postalTaxRule.effectiveAt, q.today),
				),
			)
			.orderBy(desc(postalTaxRule.effectiveAt))
			.limit(1);
		const row = rows[0];
		return row ? postalTaxRuleRowToEntity(row) : null;
	}

	// LEGACY: replaces PG function `funseguros`. Most-recent active rule whose
	// effective date is <= today and whose [valormin, valormax] bracket contains
	// the declared value. `min_declared_value_amount` and `max_declared_value_amount`
	// are nullable (legacy `valormin` / `valormax` were also nullable for
	// open-ended ranges) so each bound becomes `IS NULL OR <bound>` to keep
	// the bracket open on the NULL side. The caller (calculate-insurance
	// primitive) short-circuits when declaredValue <= 0.
	async findInsuranceRule(
		q: FindInsuranceRuleQuery,
	): Promise<InsuranceRuleRow | null> {
		const declared = q.declaredValue.toString();
		const rows = await this.db
			.select({
				id: insuranceRule.id,
				minDeclaredValueAmount: insuranceRule.minDeclaredValueAmount,
				maxDeclaredValueAmount: insuranceRule.maxDeclaredValueAmount,
				fixedInsuranceAmount: insuranceRule.fixedInsuranceAmount,
				percentageInsurance: insuranceRule.percentageInsurance,
				effectiveAt: insuranceRule.effectiveAt,
			})
			.from(insuranceRule)
			.where(
				and(
					eq(insuranceRule.isActive, true),
					lte(insuranceRule.effectiveAt, q.today),
					or(
						isNull(insuranceRule.minDeclaredValueAmount),
						lte(insuranceRule.minDeclaredValueAmount, declared),
					),
					or(
						isNull(insuranceRule.maxDeclaredValueAmount),
						gte(insuranceRule.maxDeclaredValueAmount, declared),
					),
				),
			)
			.orderBy(desc(insuranceRule.effectiveAt))
			.limit(1);
		const row = rows[0];
		return row ? insuranceRuleRowToEntity(row) : null;
	}

	// LEGACY: replaces PG function `funtraslado_age`. Single-row lookup keyed by
	// transport_charge_rule.id with effective-date filter.
	async findTransportChargeRule(
		q: FindTransportChargeRuleQuery,
	): Promise<TransportChargeRuleRow | null> {
		const rows = await this.db
			.select({
				id: transportChargeRule.id,
				amount: transportChargeRule.amount,
				effectiveAt: transportChargeRule.effectiveAt,
			})
			.from(transportChargeRule)
			.where(
				and(
					eq(transportChargeRule.id, q.transportChargeRuleId),
					eq(transportChargeRule.isActive, true),
					lte(transportChargeRule.effectiveAt, q.today),
				),
			)
			.orderBy(desc(transportChargeRule.effectiveAt))
			.limit(1);
		const row = rows[0];
		return row ? transportChargeRuleRowToEntity(row) : null;
	}

	// LEGACY: replaces PG function `funpesomax_age`. Returns the maximum
	// bracket ceiling (`max_weight_kg * 1000`) in grams for the most-recent
	// effective date matching codservicio + codtipopes + codtipobas. Joins
	// shipping_service_master so we can match by `legacy_id`. The caller
	// supplies both `shippingServiceLegacyId` (codservicio) and
	// `baseTypeCode` (codtipobas) — Nacional callers resolve them from
	// `(paymentType, destinationType)` via `nacional-rate-type-codes.ts`;
	// Casillero callers pass `locker.serviceCode` + `0` directly. Returns
	// null when no rule matches (legacy collapses to "no ceiling found").
	async findNationalBaseRateCeiling(
		q: FindNationalBaseRateCeilingQuery,
	): Promise<number | null> {
		const rows = await this.db
			.select({
				ceilingGrams: sql<string>`MAX(${nationalBaseRate.maxWeightKg} * 1000)`,
			})
			.from(nationalBaseRate)
			.innerJoin(
				shippingServiceMaster,
				eq(nationalBaseRate.shippingServiceId, shippingServiceMaster.id),
			)
			.where(
				and(
					eq(shippingServiceMaster.legacyId, q.shippingServiceLegacyId),
					eq(nationalBaseRate.weightTypeCode, q.weightTypeCode),
					eq(nationalBaseRate.baseTypeCode, q.baseTypeCode),
					eq(nationalBaseRate.isActive, true),
					lte(nationalBaseRate.effectiveAt, q.today),
				),
			)
			.groupBy(nationalBaseRate.effectiveAt)
			.orderBy(desc(nationalBaseRate.effectiveAt))
			.limit(1);
		const raw = rows[0]?.ceilingGrams;
		if (raw === undefined || raw === null) return null;
		const value = Number(raw);
		return Number.isFinite(value) ? value : null;
	}

	// LEGACY: replaces PG function `funbasiconac_age`. Two branches:
	//   - overweightKilos = 0 → bracket match:
	//       min_weight_kg * 1000 <= weightGrams <= max_weight_kg * 1000
	//   - overweightKilos > 0 → ceiling-row match: the highest `max_weight_kg`
	//       within the most-recent effective date. Ordering by
	//       `effective_at DESC, max_weight_kg DESC` followed by `LIMIT 1`
	//       resolves both criteria in a single query — Postgres sorts on the
	//       primary key first, then on the tiebreaker.
	async findNationalBaseRate(
		q: FindNationalBaseRateQuery,
	): Promise<NationalBaseRateRow | null> {
		const shippingServiceLegacyId = resolveShippingServiceLegacyId(
			q.paymentType,
		);
		const baseTypeCode = resolveBaseTypeCode(q.paymentType, q.destinationType);
		const baseConditions = [
			eq(shippingServiceMaster.legacyId, shippingServiceLegacyId),
			eq(nationalBaseRate.weightTypeCode, q.weightTypeCode),
			eq(nationalBaseRate.baseTypeCode, baseTypeCode),
			eq(nationalBaseRate.isActive, true),
			lte(nationalBaseRate.effectiveAt, q.today),
		];
		const isCeilingBranch = q.overweightKilos > 0;
		if (!isCeilingBranch) {
			const weightKg = (q.weightGrams / 1000).toString();
			baseConditions.push(
				lte(nationalBaseRate.minWeightKg, weightKg),
				gte(nationalBaseRate.maxWeightKg, weightKg),
			);
		}
		const rows = await this.db
			.select({
				id: nationalBaseRate.id,
				baseAmount: nationalBaseRate.baseAmount,
				minWeightKg: nationalBaseRate.minWeightKg,
				maxWeightKg: nationalBaseRate.maxWeightKg,
			})
			.from(nationalBaseRate)
			.innerJoin(
				shippingServiceMaster,
				eq(nationalBaseRate.shippingServiceId, shippingServiceMaster.id),
			)
			.where(and(...baseConditions))
			.orderBy(
				desc(nationalBaseRate.effectiveAt),
				...(isCeilingBranch ? [desc(nationalBaseRate.maxWeightKg)] : []),
			)
			.limit(1);
		const row = rows[0];
		return row ? nationalBaseRateRowToEntity(row) : null;
	}

	// LEGACY: replaces PG function `funcomision`. Most-recent rule whose
	// effective date is <= today, matching modeType and whose
	// [min_amount, max_amount] bracket contains `lookupAmount` (the merchandise
	// value for modeType=2, or the weight in grams for modeType=1).
	async findCommissionRule(
		q: FindCommissionRuleQuery,
	): Promise<CommissionRuleRow | null> {
		const lookup = q.lookupAmount.toString();
		const rows = await this.db
			.select({
				id: commissionRule.id,
				fixedCommissionAmount: commissionRule.fixedCommissionAmount,
				percentageCommission: commissionRule.percentageCommission,
			})
			.from(commissionRule)
			.where(
				and(
					eq(commissionRule.modeType, q.modeType),
					eq(commissionRule.isActive, true),
					lte(commissionRule.minAmount, lookup),
					gte(commissionRule.maxAmount, lookup),
					lte(commissionRule.effectiveAt, q.today),
				),
			)
			.orderBy(desc(commissionRule.effectiveAt))
			.limit(1);
		const row = rows[0];
		return row ? commissionRuleRowToEntity(row) : null;
	}

	// LEGACY: office → ruta → pesomax. Returns the per-office weight ceiling
	// in kilograms for the most-recent active route whose `return_office_id`
	// matches and that has a positive `max_weight_kg`. Returns null when no
	// route matches.
	async findRouteMaxWeightKg(
		q: FindRouteMaxWeightKgQuery,
	): Promise<number | null> {
		const rows = await this.db
			.select({ maxWeightKg: routeMaster.maxWeightKg })
			.from(routeMaster)
			.where(
				and(
					eq(routeMaster.returnOfficeId, q.returnOfficeId),
					eq(routeMaster.returnToOffice, true),
					eq(routeMaster.isActive, true),
					gt(routeMaster.maxWeightKg, '0'),
				),
			)
			.orderBy(desc(routeMaster.updatedAt))
			.limit(1);
		const raw = rows[0]?.maxWeightKg;
		if (raw === null || raw === undefined) return null;
		const value = Number(raw);
		return Number.isFinite(value) ? value : null;
	}

	// LEGACY: bounds extracted from `insurance_rule` for declared-value
	// validation — distinct from `findInsuranceRule` which returns the rate row
	// for a given value. Returns MIN(minDeclaredValueAmount) /
	// MAX(maxDeclaredValueAmount) across the rules effective on `today`,
	// scoped to the most-recent effective_at bucket so the bounds reflect the
	// current rate sheet (mirrors the GROUP BY + ORDER BY pattern used by the
	// rate-resolution queries).
	async findInsuranceBounds(
		q: FindInsuranceBoundsQuery,
	): Promise<InsuranceBounds | null> {
		const rows = await this.db
			.select({
				min: sql<string | null>`MIN(${insuranceRule.minDeclaredValueAmount})`,
				max: sql<string | null>`MAX(${insuranceRule.maxDeclaredValueAmount})`,
			})
			.from(insuranceRule)
			.where(
				and(
					eq(insuranceRule.isActive, true),
					lte(insuranceRule.effectiveAt, q.today),
				),
			)
			.groupBy(insuranceRule.effectiveAt)
			.orderBy(desc(insuranceRule.effectiveAt))
			.limit(1);
		const row = rows[0];
		if (!row) return null;
		const min = row.min === null ? null : Number(row.min);
		const max = row.max === null ? null : Number(row.max);
		if (
			min === null ||
			max === null ||
			!Number.isFinite(min) ||
			!Number.isFinite(max)
		) {
			return null;
		}
		return { min, max };
	}
}
