// LEGACY: replaces PHP helper `_calculoTipoPeso` (no PG function — pure model lookup) (Deviation 5)
//
// Thin wrapper over `CatalogReaderPort.resolveWeightTypeCode`. The port
// takes a discriminated `ResolveWeightTypeCodeArgs` — the caller picks the
// branch explicitly (`by_destination_city` for Nacional, `by_office_legacy_id`
// for Casillero). This primitive's only job is the legacy `null → 0`
// collapse:
//
//   // routing2702enproduccion.php L16569 / L16574
//   if (@empty($codtipopes)) $codtipopes = 0;
//
// so every caller always receives a defined weight-type code, matching
// legacy behavior. The port itself keeps an honest `Promise<number | null>`
// signature so the data layer can still signal a true miss when needed for
// diagnostics.

import type {
	CatalogReaderPort,
	ResolveWeightTypeCodeArgs,
} from '../ports/out/catalog-reader.port';

export type ResolveWeightTypeCodeInput = ResolveWeightTypeCodeArgs;

export interface ResolveWeightTypeCodeDeps {
	catalogReader: CatalogReaderPort;
}

export async function resolveWeightTypeCode(
	input: ResolveWeightTypeCodeInput,
	deps: ResolveWeightTypeCodeDeps,
): Promise<number> {
	const result = await deps.catalogReader.resolveWeightTypeCode(input);
	// Legacy collapses every "not found" outcome to 0.
	return result ?? 0;
}
