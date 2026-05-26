// LEGACY: replaces PG function `funbasiconac_age` + the legacy ceiling/overweight
// chunking that runs alongside it in `calculoTarifaNacional`.
//
// This primitive does NOT apply complement — the use case applies complement
// at the freight-total level (see exploration_analysis.md §5.5 + §7c, and the
// LEGACY DEVIATION block in `calculate-national-overweight-amount.ts`). The
// caller multiplies `baseFreight` by `(1 + complement/100)` after the fact.

import type { TDestinationType, TPaymentType } from '@zoom/schemas';
import { NationalBaseRateNotFoundException } from '../../domain/exceptions/national-base-rate-not-found.exception';
import type { PricingRuleRepositoryPort } from '../ports/out/pricing-rule-repository.port';
import { calculateOverweightKilos } from './calculate-overweight-kilos';
import {
	resolveBaseTypeCode,
	resolveShippingServiceLegacyId,
} from './nacional-rate-type-codes';

export interface CalculateNationalBaseFreightInput {
	weightKg: number;
	// LEGACY: was `codtipopes` — resolved from `transit_matrix`.
	weightTypeCode: number;
	// Pricing dimensions. The Drizzle adapter resolves these into the
	// persistence-layer `codservicio` + `codtipobas` integers; the primitive
	// never touches them.
	paymentType: TPaymentType;
	destinationType: TDestinationType;
	today: Date;
}

export interface CalculateNationalBaseFreightOutput {
	// LEGACY: `basico`. Raw amount from `national_base_rate.base_amount`.
	baseFreight: number;
	// LEGACY: `pesomax_g`. Grams. The use case forwards this to the overweight
	// primitive so the bracket lookup uses the same ceiling.
	ceilingWeightGrams: number;
	// LEGACY: `kilossob` — count of 500-g chunks above the ceiling. 0 when the
	// shipment fits within the bracket.
	overweightHalfKilos: number;
}

export interface CalculateNationalBaseFreightDeps {
	pricingRepo: PricingRuleRepositoryPort;
}

export async function calculateNationalBaseFreight(
	input: CalculateNationalBaseFreightInput,
	deps: CalculateNationalBaseFreightDeps,
): Promise<CalculateNationalBaseFreightOutput> {
	// 1. Fetch the ceiling weight in grams. The port speaks legacy integer
	// codes (codservicio + codtipobas) — resolve them from the domain enums
	// here at the caller, mirroring legacy's
	// `funpesomax_age($codservicio, ..., $codtipobas)` contract.
	const ceilingWeightGrams = await deps.pricingRepo.findNationalBaseRateCeiling(
		{
			shippingServiceLegacyId: resolveShippingServiceLegacyId(
				input.paymentType,
			),
			baseTypeCode: resolveBaseTypeCode(
				input.paymentType,
				input.destinationType,
			),
			weightTypeCode: input.weightTypeCode,
			today: input.today,
		},
	);

	// 2. Compute overweight chunks. Legacy collapses "no ceiling" to 0 chunks
	// (mirrors `funpesomax_age` returning NULL — see `calculate-overweight-kilos`
	// for the SQL CASE fallthrough).
	const overweightHalfKilos = calculateOverweightKilos({
		weightKg: input.weightKg,
		maxWeightKg: ceilingWeightGrams === null ? null : ceilingWeightGrams / 1000,
	});

	// 3. Resolve the rate row. Branches inside `findNationalBaseRate`:
	//      overweightKilos > 0 → ceiling-row match
	//      overweightKilos = 0 → bracket match on weight in grams
	const row = await deps.pricingRepo.findNationalBaseRate({
		weightTypeCode: input.weightTypeCode,
		paymentType: input.paymentType,
		destinationType: input.destinationType,
		weightGrams: input.weightKg * 1000,
		overweightKilos: overweightHalfKilos,
		today: input.today,
	});

	if (!row) {
		throw new NationalBaseRateNotFoundException({
			weightTypeCode: input.weightTypeCode,
			paymentType: input.paymentType,
			destinationType: input.destinationType,
			weightKg: input.weightKg,
		});
	}

	return {
		baseFreight: Number(row.baseAmount),
		ceilingWeightGrams: ceilingWeightGrams ?? 0,
		overweightHalfKilos,
	};
}
