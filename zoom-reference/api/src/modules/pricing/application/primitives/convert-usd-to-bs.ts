import { roundMonetary } from './round-monetary';

/**
 * Convert USD to Bs at the supplied BCV rate, rounded to 2 decimals via the
 * pricing engine's shared rounding helper.
 *
 * Used by the calculate controllers to translate the public `declaredValueUsd`
 * into the internal `declaredValue` (Bs) before invoking the use case.
 */
export function convertUsdToBs(usd: number, bcvRate: number): number {
	return roundMonetary(usd * bcvRate);
}
