import type { TRecipientType } from '@zoom/schemas';

// LEGACY: SLA estimate (`diasadimer` / `diasadidoc` from origendestino).
// Both columns are nullable in the legacy CSV; UI hides the row when both
// are null. The use case treats this as non-blocking — a `null` return just
// means "no SLA row for this O/D" and pricing proceeds.
export interface TransitEstimateRow {
	merchandiseDays: number | null;
	documentDays: number | null;
}

// LEGACY: destination-city context bundle for eligibility + ceiling checks
// inside the Nacional pricing use case.
//   - `maxWeightKg` — `ciudad.pesomax / 1000` (door-to-door ceiling)
//   - `supportsCod` — `ciudad.cod = 't'` (COD eligibility)
//   - `paperDeliveryDisabled` — `ciudad.noentregapap = 't'` (home delivery suppressed)
//   - `operatingOfficeId` / `transportChargeRuleId` — pricing FKs reused downstream
export interface CityContextRow {
	id: string;
	legacyId: number;
	maxWeightKg: number;
	supportsCod: boolean;
	paperDeliveryDisabled: boolean;
	operatingOfficeId: string | null;
	transportChargeRuleId: string | null;
}

/**
 * Discriminated input for `resolveWeightTypeCode`. The discriminator reuses
 * the shared `TRecipientType` enum (`'guia' | 'locker'` —
 * `packages/schemas/src/shared/shipping-service-enums.schema.ts`) because
 * each value lines up exactly with one of the two branches in legacy
 * `_calculoTipoPeso`:
 *
 *   - `recipientType: 'guia'`  — Nacional flows (home OR office pickup).
 *     The adapter indirects through
 *     `city_master(destinationCityId).operating_office_id` to find the
 *     office that drives the transit-matrix lookup. The caller does NOT
 *     need to know which office that is; the catalog resolves it.
 *
 *   - `recipientType: 'locker'` — Casillero flow. The caller already knows
 *     the destination office's `codoficina` (legacy id) and asks the
 *     catalog to filter `office_master.legacy_id` directly.
 *
 * The discriminator replaces the previous "pass a truthy UUID as a flag"
 * design — the UUID's value was never read in the `guia` branch, which
 * made the intent opaque and led to a real bug (home-delivery requests
 * passed `undefined` and silently fell through to a `weightTypeCode = 0`
 * rate lookup that matches no seeded row).
 */
export type ResolveWeightTypeCodeArgs =
	| {
			recipientType: Extract<TRecipientType, 'guia'>;
			originCityId: string;
			destinationCityId: string;
	  }
	| {
			recipientType: Extract<TRecipientType, 'locker'>;
			originCityId: string;
			// LEGACY: `codoficina` of the destination office (the legacy
			// variable name `codestaciondes` is misleading — every production
			// caller assigns an office id, not a station code).
			destinationOfficeLegacyId: number;
	  };

/**
 * CatalogReaderPort — pricing's facade into the `catalog` module.
 *
 * Per the cross-module convention in `apps/api/CLAUDE.md` (rule 2), the
 * abstract class is defined HERE (in the consumer) and implemented in
 * `catalog/infrastructure/adapters/catalog-reader.adapter.ts`. The catalog
 * module exports the binding via its NestJS module.
 */
export abstract class CatalogReaderPort {
	/**
	 * Resolves the `weight_type_code` to use for an origin → destination pair
	 * (legacy `_calculoTipoPeso`). The caller picks the branch explicitly via
	 * `args.recipientType`; see `ResolveWeightTypeCodeArgs` for the two variants.
	 *
	 * @returns the resolved `weight_type_code`, or `null` if no row matches.
	 *   The `resolve-weight-type-code.ts` primitive collapses `null → 0` to
	 *   match legacy `if (@empty($codtipopes)) $codtipopes = 0;`.
	 */
	abstract resolveWeightTypeCode(
		args: ResolveWeightTypeCodeArgs,
	): Promise<number | null>;

	/**
	 * Returns SLA days (mercancía + documento) for the O/D pair, or `null`
	 * when no `transit_matrix` row exists. AC-06: non-blocking — pricing
	 * continues without an estimate when the row is missing.
	 *
	 * LEGACY: `origendestino.diasadimer` and `origendestino.diasadidoc`.
	 */
	abstract findTransitEstimate(args: {
		originCityId: string;
		destinationCityId: string;
	}): Promise<TransitEstimateRow | null>;

	/**
	 * Returns the destination city's pricing-eligibility context, or `null`
	 * when the city does not exist. Caller throws `RouteNotFoundException`
	 * on null; eligibility checks (door-to-door, COD) then run on the row.
	 *
	 * LEGACY: bundled lookup of `ciudad.pesomax`, `ciudad.cod`,
	 * `ciudad.noentregapap`, `ciudad.codoficinaope`, and the city's transport
	 * charge rule — replacing four separate legacy queries.
	 */
	abstract findCityContext(args: {
		cityId: string;
	}): Promise<CityContextRow | null>;

	/**
	 * Resolves a `shipping_service_master.id` (UUID) for a given `legacy_id`
	 * (`codservicio`). Returns `null` when no row matches.
	 *
	 * Used by the Nacional pricing use case to translate the integer
	 * `codservicio` derived from `paymentType` into the UUID expected by the
	 * shared primitives (`calculateNationalOverweightAmount`,
	 * `calculatePostalTax`, …) and their repository ports.
	 */
	abstract findShippingServiceIdByLegacyId(
		legacyId: number,
	): Promise<string | null>;
}
