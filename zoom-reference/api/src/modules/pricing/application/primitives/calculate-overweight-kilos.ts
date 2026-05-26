// LEGACY: replaces the inline SQL CASE inside PHP helper `_kiloSobrePes`
// (class.servicios.php:101). Pure sync function — no I/O.
//
// Legacy SQL (called via `_kiloSobrePes`):
//   CASE WHEN pesobru*1000 > funpesomax_age(codservicio, codtipopes, 0, 0, today, codtipobas)
//        THEN ceil((pesobru - funpesomax_age(...)/1000) / 0.5)
//        ELSE 0
//   END
//
// This primitive implements only the CEIL math. The threshold lookup
// (`funpesomax_age` → max(basiconac.pesomax)) is the caller's job, performed
// via `PricingRuleRepositoryPort.findNationalBaseRateCeiling` — the result
// (in grams) is divided by 1000 and passed in here as `maxWeightKg`. The
// `null` short-circuit mirrors the legacy SQL CASE fallthrough when
// `funpesomax_age` returns NULL (no basiconac row for the codservicio at
// the effective date).
//
// Callers:
//   - `calculate-national-base-freight.ts` (Nacional flow, S-001)
//   - `calculate-locker-pricing.use-case.ts` (Casillero with-freight branch, S-002)
//
// ⚠ NAMING NOTE (paridad with legacy):
// The function name, the `overweightKilos` return value, and the response
// field `detail.overweightKilos` are MISNOMERS preserved from legacy
// `_kiloSobrePes` / `kilossob`. The value is a COUNT OF 500 g CHUNKS above
// the threshold (note the `ceil(... / 0.5)` below). A 1.5 kg overage yields
// 3, not 1.5. The overweight billing rule downstream multiplies the count
// by a Bs-per-chunk rate.

export interface CalculateOverweightKilosInput {
	weightKg: number;
	// Caller-supplied threshold (in kg). `null` represents "no rule found"
	// and is the equivalent of legacy `funpesomax_age` returning NULL — the
	// primitive short-circuits to 0, matching the legacy SQL CASE
	// fallthrough. Callers MUST pass `null` rather than `0` for the
	// "missing rule" case to avoid silently over-charging every shipment.
	maxWeightKg: number | null;
}

export function calculateOverweightKilos(
	input: CalculateOverweightKilosInput,
): number {
	if (input.maxWeightKg === null) {
		return 0;
	}
	const excess = input.weightKg - input.maxWeightKg;
	if (excess <= 0) {
		return 0;
	}
	return Math.ceil(excess / 0.5);
}
