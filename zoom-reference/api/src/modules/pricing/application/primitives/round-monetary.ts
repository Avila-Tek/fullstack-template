/**
 * Rounds a monetary amount to 2 decimal places.
 *
 * LEGACY PARITY (load-bearing — DO NOT "fix" without coordinating):
 *   The legacy taquilla algorithm rounds with Postgres `round(numeric, 2)`
 *   inside its stored functions (`funbasiconac_age`, `funcomision`,
 *   `funfpo`, …) and PHP `round($value, 2)` at the call sites. Both follow
 *   IEEE 754 round-half-away-from-zero on floating-point inputs, so a value
 *   like 1.005 (actually stored as 1.00499999…) lands on 1.00, not 1.01.
 *
 *   `Math.round(n * 100) / 100` produces the IDENTICAL result for the
 *   inputs the pricing engine sees, which is the project's hard parity
 *   constraint. Common "safer" rewrites BREAK parity:
 *
 *     - `Math.round((n + Number.EPSILON) * 100) / 100` — different result
 *       for half-cent edge cases.
 *     - decimal.js / bignumber.js — uses banker's rounding by default;
 *       would diverge from legacy on .5 boundaries.
 *
 *   When (if ever) the system decouples from taquilla parity, swap the
 *   implementation here — call sites stay unchanged.
 *
 * Safe within the constraints of this pricing engine:
 *   - all inputs are non-negative (no asymmetric negative rounding)
 *   - all values are well below `Number.MAX_SAFE_INTEGER / 100` (~90T)
 *   - inputs are derived from rate × weight / pct multiplications, not
 *     literal half-cent values that surface FP artifacts.
 */
export function roundMonetary(n: number): number {
	return Math.round(n * 100) / 100;
}
