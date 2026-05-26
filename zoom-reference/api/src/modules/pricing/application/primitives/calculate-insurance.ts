// LEGACY: replaces PG function `funseguros` + PHP wrapper `_calculoSeguro` (Deviation 5)
//
// Returns the insurance amount for a declared shipment value. Mirrors the
// legacy short-circuit: `declaredValue <= 0` returns 0 without a DB lookup.
//
// Fixed-vs-percentage discriminator — matches legacy `tarifas_nacional.php`
// L195–202 exactly:
//   if ((seguro<>0) && (seguro<>'')) { $seguro = $row['seguro']; }
//   else                              { $seguro = $valor * $row['porcentaje']; }
// i.e. fixed amount applies ONLY when it is non-zero and non-null/empty;
// fixed=0 (or null) falls through to the percentage path. Our `if (fixed > 0)`
// preserves this — both null (mapped to 0 below) and 0 fall through.
//
// The caller is responsible for deciding whether to SUM this into the total —
// per spec_back §"Compatibility rule 4", Casillero does NOT sum insurance.

import type { PricingRuleRepositoryPort } from '../ports/out/pricing-rule-repository.port';
import { roundMonetary } from './round-monetary';

export interface CalculateInsuranceInput {
	declaredValue: number;
	today: Date;
}

export interface CalculateInsuranceDeps {
	pricingRepo: PricingRuleRepositoryPort;
}

export async function calculateInsurance(
	input: CalculateInsuranceInput,
	deps: CalculateInsuranceDeps,
): Promise<number> {
	if (input.declaredValue <= 0) {
		return 0;
	}
	const rule = await deps.pricingRepo.findInsuranceRule({
		declaredValue: input.declaredValue,
		today: input.today,
	});
	if (!rule) {
		return 0;
	}
	const fixed = rule.fixedInsuranceAmount ?? 0;
	if (fixed > 0) {
		return roundMonetary(fixed);
	}

	const percentage = rule.percentageInsurance ?? 0;
	return roundMonetary(input.declaredValue * percentage);
}
