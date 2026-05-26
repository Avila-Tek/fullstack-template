// LEGACY: replaces PG function `funfpo` (postal franking function) + PHP wrapper `_calculoTasaPostal` (Deviation 5)
//
// Reads the most-recent active postal_tax_rule whose [pesomin, pesomax] bracket
// contains the input weight (in grams) for the given service + weightTypeCode,
// and returns either:
//   - rule.taxAmount  (when rule.percentage <= 0 / null), OR
//   - freightAmount * rule.percentage / 100  (when rule.percentage > 0)
//
// Returns 0 when no rule matches. Result is rounded to 2 decimal places —
// mirroring the legacy `round(tasapostal, 2)` line at the end of funfpo.
//
// ─────────────────────────────────────────────────────────────────────────────
// SCOPE: NATIONAL BRANCH ONLY
// ─────────────────────────────────────────────────────────────────────────────
// Legacy `funfpo` has TWO branches in its body:
//
//   IF ($3<>3 and $3<>66) THEN  -- national branch
//     SELECT * FROM tasapos
//      WHERE peso BETWEEN pesomin AND pesomax
//        AND codtipopes = $2 AND codservicio = $3 AND fechaini <= $4
//      ORDER BY fechaini DESC LIMIT 1;
//   END IF;
//
//   IF ($3=3 OR $3=66) THEN     -- international branch
//     SELECT * FROM tasapos, pais
//      WHERE peso BETWEEN tasapos.pesomin AND tasapos.pesomax
//        AND tasapos.codservicio = $3 AND tasapos.fechaini <= $4
//        AND pais.codpais = $5 AND pais.codzona = tasapos.codzona
//      ORDER BY fechaini DESC LIMIT 1;
//   END IF;
//
// This primitive implements the **national branch only**. The international
// branch (codservicio 3 = ENVIOS INTERNACIONALES, codservicio 66 = related)
// is **intentionally not covered** because in the new architecture
// international pricing is fully delegated to DHL via `consultarPreciosDhl`
// (see E-006 epic §2 Scope and Out of Scope). S-003 does not call this
// primitive; the international branch of legacy `funfpo` is dead code in
// the new system.
//
// If a future flow ever needs the legacy international postal-tax formula,
// two changes are required, neither of which is on the roadmap:
//   1. In `findPostalTaxRule`, conditionally drop the `weightTypeCode` filter
//      when `shippingServiceLegacyId ∈ {3, 66}` (legacy international skips it).
//   2. Add a country-zone filter (`country_master` table read +
//      `postal_tax_rule.zone_code` match — the column already exists on the
//      schema and on `PostalTaxRuleRow`).

import type { PricingRuleRepositoryPort } from '../ports/out/pricing-rule-repository.port';
import { roundMonetary } from './round-monetary';

export interface CalculatePostalTaxInput {
	shippingServiceId: string;
	weightTypeCode: number;
	// LEGACY: was `peso_g`. Used for the pesomin/pesomax bracket match.
	weightGrams: number;
	today: Date;
	// LEGACY: was `flete` / `monto`. 0 for Casillero flat branch; freight raw
	// or freight-with-complement for Nacional.
	freightAmount: number;
}

export interface CalculatePostalTaxDeps {
	pricingRepo: PricingRuleRepositoryPort;
}

export async function calculatePostalTax(
	input: CalculatePostalTaxInput,
	deps: CalculatePostalTaxDeps,
): Promise<number> {
	const rule = await deps.pricingRepo.findPostalTaxRule({
		shippingServiceId: input.shippingServiceId,
		weightTypeCode: input.weightTypeCode,
		weightGrams: input.weightGrams,
		today: input.today,
	});
	if (!rule) {
		return 0;
	}
	const percentage = rule.percentage ?? 0;
	if (percentage > 0) {
		return roundMonetary((input.freightAmount * percentage) / 100);
	}

	return roundMonetary(rule.taxAmount);
}
