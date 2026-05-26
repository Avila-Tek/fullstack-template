/**
 * Returns the raw overweight charge: overweightKilos * rule.overweightAmount, rounded to 2 decimals.
 *
 * LEGACY DEVIATION:
 * The PHP equivalent `_calculoSobrePeso` (routing2702enproduccion.php L16617) takes a
 * `$complemento` parameter and applies it internally:
 *   $sobrepeso = $sobrepeso + ($sobrepeso * ($complemento / 100))
 *
 * This primitive does NOT apply complement. The caller is responsible for applying it:
 *   - Casillero use case: applies it directly on overweightAmount
 *                         (overweightAmount * (1 + nationalComplement/100))
 *   - Nacional use case:  applies it at the freight-total level (see TarifaDAL.php L364
 *                         which bypasses _calculoSobrePeso and applies complement to the
 *                         whole freight via the §5.5 algorithm)
 *
 * The deviation is intentional: it eliminates the legacy inconsistency where Casillero
 * and Nacional disagree on where complement lands. See spec.md "Deviation 1" for the
 * full rationale.
 */

// LEGACY: replaces PG function `funsobrepesonac_age` + PHP wrapper `_calculoSobrePeso` (Deviation 5)

import type { PricingRuleRepositoryPort } from '../ports/out/pricing-rule-repository.port';
import { roundMonetary } from './round-monetary';

export interface CalculateNationalOverweightAmountInput {
	overweightKilos: number;
	shippingServiceId: string;
	weightTypeCode: number;
	// LEGACY: was `codtiposob`. 0 for puerta-a-puerta and Casillero; RO/PP for
	// COD office pickup.
	overweightTypeCode: number;
	today: Date;
}

export interface CalculateNationalOverweightAmountDeps {
	pricingRepo: PricingRuleRepositoryPort;
}

export async function calculateNationalOverweightAmount(
	input: CalculateNationalOverweightAmountInput,
	deps: CalculateNationalOverweightAmountDeps,
): Promise<number> {
	if (input.overweightKilos <= 0) {
		return 0;
	}
	const rule = await deps.pricingRepo.findOverweightRule({
		shippingServiceId: input.shippingServiceId,
		weightTypeCode: input.weightTypeCode,
		overweightTypeCode: input.overweightTypeCode,
		overweightKilos: input.overweightKilos,
		today: input.today,
	});
	if (!rule) {
		return 0;
	}
	// Raw amount: overweightKilos × rule.overweightAmount. NO complement here —
	// see the LEGACY DEVIATION block above.
	return roundMonetary(input.overweightKilos * rule.overweightAmount);
}
