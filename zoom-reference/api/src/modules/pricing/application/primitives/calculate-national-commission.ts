// LEGACY: replaces the commission lookup in `calculoTarifaNacional`
// (`TarifaDAL.php`). Resolves the COD commission amount from `commission_rule`
// — the `funcomision` equivalent. Nacional-only; Casillero never computes
// commission.
//
// Two branches mirror the legacy `modalidad` discriminator:
//   merchandiseValue > 0 → by-value  (mode_type=2). Lookup uses the declared
//                          value; percentage is applied to that same value.
//   merchandiseValue = 0 → by-weight (mode_type=1). Lookup uses `peso_g`;
//                          percentage is applied to `subtotalBeforeCommission`.
//
// Returns raw amount — complement is applied at the use-case level (mirrors
// the deviation documented in `calculate-national-overweight-amount.ts`).

import type {
	CommissionRuleRow,
	PricingRuleRepositoryPort,
} from '../ports/out/pricing-rule-repository.port';
import { roundMonetary } from './round-monetary';

export interface CalculateNationalCommissionInput {
	// LEGACY: `valor_mercancia`. For COD this is the declared value; 0 means
	// "no value declared" and triggers the by-weight branch.
	merchandiseValue: number;
	// LEGACY: `peso_g`. Used as the lookup key in the by-weight branch.
	weightGrams: number;
	// LEGACY: `basico + traslado + sobrepeso + seguro`. The percentage base
	// for the by-weight branch — legacy applies the commission percentage to
	// the running subtotal, not to the weight.
	subtotalBeforeCommission: number;
	today: Date;
}

export interface CalculateNationalCommissionOutput {
	commissionAmount: number;
	// `null` when no rule matches — keeps the audit trail honest.
	ruleId: string | null;
}

export interface CalculateNationalCommissionDeps {
	pricingRepo: PricingRuleRepositoryPort;
}

export async function calculateNationalCommission(
	input: CalculateNationalCommissionInput,
	deps: CalculateNationalCommissionDeps,
): Promise<CalculateNationalCommissionOutput> {
	// LEGACY: tarifas_cod.php:190-220 tries modalidad=2 (by-value) first when
	// declaredValue > 0. If that query returns no row OR the row has both
	// fixed=0 and percentage=0, it falls back to modalidad=1 (by-weight) —
	// percentage applied to $subtotalfle, else fixed amount.
	if (input.merchandiseValue > 0) {
		const byValueRule = await deps.pricingRepo.findCommissionRule({
			lookupAmount: input.merchandiseValue,
			modeType: 2,
			today: input.today,
		});
		if (byValueRule) {
			const raw = computeRawCommission(byValueRule, input.merchandiseValue);
			if (raw > 0) {
				return { commissionAmount: roundMonetary(raw), ruleId: byValueRule.id };
			}
		}
	}

	// Fallback: modalidad=1 (by-weight). Also the primary path when
	// declaredValue = 0. Percentage rules apply to subtotalBeforeCommission.
	const byWeightRule = await deps.pricingRepo.findCommissionRule({
		lookupAmount: input.weightGrams,
		modeType: 1,
		today: input.today,
	});
	if (!byWeightRule) {
		return { commissionAmount: 0, ruleId: null };
	}
	const raw = computeRawCommission(
		byWeightRule,
		input.subtotalBeforeCommission,
	);
	return { commissionAmount: roundMonetary(raw), ruleId: byWeightRule.id };
}

function computeRawCommission(
	rule: CommissionRuleRow,
	referenceAmount: number,
): number {
	const fixed =
		rule.fixedCommissionAmount === null
			? 0
			: Number(rule.fixedCommissionAmount);
	if (fixed > 0) return fixed;
	const percentage =
		rule.percentageCommission === null ? 0 : Number(rule.percentageCommission);
	if (percentage <= 0) return 0;
	return (percentage / 100) * referenceAmount;
}
