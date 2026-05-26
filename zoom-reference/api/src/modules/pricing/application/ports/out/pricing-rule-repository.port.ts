import type { TDestinationType, TPaymentType } from '@zoom/schemas';

// LEGACY parameter names preserved on the port surface where they map 1:1
// to the legacy stored functions (e.g. `shippingServiceLegacyId` ↔ codservicio,
// `baseTypeCode` ↔ codtipobas). Domain enums (`TPaymentType`,
// `TDestinationType`) are accepted on methods that consume them; methods
// modeled directly after legacy PG functions accept the raw integer codes
// so the caller — not the adapter — decides which codservicio/codtipobas to
// query. See `nacional-rate-type-codes.ts` for the canonical resolvers
// callers use to translate `(paymentType, destinationType)` into the
// integer codes.

// Row shapes returned by the repository. Numeric DB columns (Drizzle
// `numeric()` types come back as strings from node-postgres) are coerced
// to `number` inside the repository's row-to-entity mappers so callers
// never have to know the DB precision representation. Dates are already
// `Date` (mode: 'date') and UUIDs are plain strings.

export interface OverweightRuleRow {
	id: string;
	overweightAmount: number;
	minWeightKg: number;
	maxWeightKg: number;
	weightTypeCode: number;
	shippingServiceId: string;
	overweightTypeCode: number | null;
	effectiveAt: Date | null;
}

export interface PostalTaxRuleRow {
	id: string;
	minWeightKg: number;
	maxWeightKg: number;
	taxAmount: number;
	weightTypeCode: number;
	shippingServiceId: string;
	percentage: number | null;
	percentageWeight: number | null;
	effectiveAt: Date | null;
}

export interface InsuranceRuleRow {
	id: string;
	minDeclaredValueAmount: number | null;
	maxDeclaredValueAmount: number | null;
	fixedInsuranceAmount: number | null;
	percentageInsurance: number | null;
	effectiveAt: Date | null;
}

export interface TransportChargeRuleRow {
	id: string;
	amount: number;
	effectiveAt: Date | null;
}

// LEGACY: row shape returned by `funbasiconac_age`. `baseAmount` is `basico`
// — raw, no complement applied. Numeric fields are coerced from DB strings.
export interface NationalBaseRateRow {
	id: string;
	baseAmount: number;
	minWeightKg: number;
	maxWeightKg: number;
}

// LEGACY: row shape returned by `funcomision`. Either `fixedCommissionAmount`
// or `percentageCommission` is non-zero — never both — but the schema permits
// both being present so the use case branches on `fixedCommissionAmount > 0`.
// Numeric fields are coerced from DB strings.
export interface CommissionRuleRow {
	id: string;
	fixedCommissionAmount: number | null;
	percentageCommission: number | null;
}

export interface FindOverweightRuleQuery {
	shippingServiceId: string;
	weightTypeCode: number;
	overweightTypeCode: number;
	// LEGACY: was `$3` / `$kilossob` in `funsobrepesonac_age` — filters the
	// `pesomin BETWEEN pesomax` bracket on the rule row.
	overweightKilos: number;
	today: Date;
}

export interface FindPostalTaxRuleQuery {
	shippingServiceId: string;
	weightTypeCode: number;
	// LEGACY: was `peso_g` — filters the `pesomin BETWEEN pesomax` bracket.
	weightGrams: number;
	today: Date;
}

export interface FindInsuranceRuleQuery {
	declaredValue: number;
	today: Date;
}

export interface FindTransportChargeRuleQuery {
	transportChargeRuleId: string;
	today: Date;
}

// LEGACY: `funpesomax_age` — ceiling (max bracket) weight in grams for the
// given pricing dimensions.
//
// The port speaks legacy integer codes (codservicio + codtipobas) so the
// caller decides which codservicio to query. This mirrors legacy's
// `funpesomax_age($codservicio, ..., $codtipobas)` SQL function exactly —
// no enum translation inside the adapter. Nacional callers resolve
// `(paymentType, destinationType)` into these codes via
// `resolveShippingServiceLegacyId` + `resolveBaseTypeCode` from
// `nacional-rate-type-codes.ts`. Casillero callers pass the locker's
// `serviceCode` directly with `baseTypeCode = 0` (legacy `_kiloSobrePes`
// default — `procesarFormCasillero` never overrides it).
export interface FindNationalBaseRateCeilingQuery {
	// LEGACY: was `$1` / codservicio.
	shippingServiceLegacyId: number;
	// LEGACY: was `$6` / codtipobas. Casillero hardcodes 0.
	baseTypeCode: number;
	// LEGACY: was `$2` / codtipopes — resolved from `transit_matrix`.
	weightTypeCode: number;
	today: Date;
}

// LEGACY: `funbasiconac_age`. Two branches:
//   - overweightKilos = 0 → bracket match (pesomin <= weightGrams <= pesomax)
//   - overweightKilos > 0 → ceiling-row match (max_weight_kg = pesomax_kg)
//
// As with the ceiling query, the adapter resolves `codservicio` and
// `codtipobas` from `(paymentType, destinationType)` internally.
export interface FindNationalBaseRateQuery {
	weightTypeCode: number;
	paymentType: TPaymentType;
	destinationType: TDestinationType;
	weightGrams: number;
	overweightKilos: number;
	today: Date;
}

// LEGACY: `funcomision`. `lookupAmount` is `valor_mercancia` for modeType=2
// (by-value) or `peso_g` for modeType=1 (by-weight).
export interface FindCommissionRuleQuery {
	lookupAmount: number;
	modeType: 1 | 2;
	today: Date;
}

// LEGACY: office → ruta → pesomax. `returnOfficeId` is the office UUID; the
// adapter joins through `route_master.return_office_id`.
export interface FindRouteMaxWeightKgQuery {
	returnOfficeId: string;
}

// LEGACY: bounds extracted from `insurance_rule` for declared-value validation
// — distinct from `findInsuranceRule` which returns the rate row for a given
// value.
export interface FindInsuranceBoundsQuery {
	today: Date;
}

export interface InsuranceBounds {
	min: number;
	max: number;
}

/**
 * Reads PRICING-OWNED tables only — never crosses the module boundary into
 * `region`, `catalog`, `profiles`, etc. Cross-module reads go through the
 * dedicated `*ReaderPort` ports.
 */
export abstract class PricingRuleRepositoryPort {
	abstract findOverweightRule(
		query: FindOverweightRuleQuery,
	): Promise<OverweightRuleRow | null>;

	abstract findPostalTaxRule(
		query: FindPostalTaxRuleQuery,
	): Promise<PostalTaxRuleRow | null>;

	abstract findInsuranceRule(
		query: FindInsuranceRuleQuery,
	): Promise<InsuranceRuleRow | null>;

	abstract findTransportChargeRule(
		query: FindTransportChargeRuleQuery,
	): Promise<TransportChargeRuleRow | null>;

	abstract findNationalBaseRateCeiling(
		query: FindNationalBaseRateCeilingQuery,
	): Promise<number | null>;

	abstract findNationalBaseRate(
		query: FindNationalBaseRateQuery,
	): Promise<NationalBaseRateRow | null>;

	abstract findCommissionRule(
		query: FindCommissionRuleQuery,
	): Promise<CommissionRuleRow | null>;

	abstract findRouteMaxWeightKg(
		query: FindRouteMaxWeightKgQuery,
	): Promise<number | null>;

	abstract findInsuranceBounds(
		query: FindInsuranceBoundsQuery,
	): Promise<InsuranceBounds | null>;
}
