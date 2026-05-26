import { roundMonetary } from './round-monetary';

/**
 * Convert Bs to USD at the supplied BCV rate, rounded to 2 decimals. Returns 0
 * defensively for non-positive rates — preserves the legacy
 * `bcvRate > 0 ? … : 0` guard used inside the calculate use cases.
 *
 * Used by:
 *   - both calculate use cases (replaces the inline `total / bcvRate`
 *     expression with a single, named conversion).
 *   - the limits controller (projects internal Bs bounds → public USD bounds).
 */
export function convertBsToUsd(bs: number, bcvRate: number): number {
	return bcvRate > 0 ? roundMonetary(bs / bcvRate) : 0;
}
