/**
 * Returns transport_charge_rule.amount for the given rule ID, effective at `today`.
 *
 * LEGACY DEVIATION:
 * The PHP equivalent `_calculoTraslado` (routing2702enproduccion.php L16647) accepts a
 * `$complemento` parameter, but the line that applied it has been commented out since
 * 2019-11-19 (legacy comment: "El complemento se va a calcular del flete total").
 * Both Casillero and Nacional call the helper with a complement value, and both ignore it.
 *
 * This primitive removes the parameter from the signature entirely. If a future flow
 * needs to apply complement on the transport charge, it must be done explicitly in the
 * use case — not by uncommenting a hidden line in a shared helper. See spec.md "Deviation 2".
 */

// LEGACY: replaces PG function `funtraslado_age` + PHP wrapper `_calculoTraslado` (Deviation 5)

import type { PricingRuleRepositoryPort } from '../ports/out/pricing-rule-repository.port';

export interface CalculateTransportChargeInput {
	transportChargeRuleId: string;
	today: Date;
}

export interface CalculateTransportChargeDeps {
	pricingRepo: PricingRuleRepositoryPort;
}

export async function calculateTransportCharge(
	input: CalculateTransportChargeInput,
	deps: CalculateTransportChargeDeps,
): Promise<number> {
	const rule = await deps.pricingRepo.findTransportChargeRule({
		transportChargeRuleId: input.transportChargeRuleId,
		today: input.today,
	});
	if (!rule) {
		return 0;
	}
	return rule.amount;
}
