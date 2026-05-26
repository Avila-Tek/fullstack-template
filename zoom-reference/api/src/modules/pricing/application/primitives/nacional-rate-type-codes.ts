import type { TDestinationType, TPaymentType } from '@zoom/schemas';

// LEGACY: replaces `tipobas`, `tiposob`, and the `codservicio` discriminator
// for national guía pricing (DBML L1212–1213 — no dedicated tipobas/tiposob
// tables exist; the codes are stored as integer columns on the rate tables
// themselves).
//
//   `shipping_service_master.legacy_id`        ← codservicio
//   `national_base_rate.base_type_code`         ← codtipobas
//   `national_overweight_rule.overweight_type_code` ← codtiposob
//
// Values verified against seeded data (basiconac.csv + sobrepesonac.csv):
//
//   codservicio (national guía only):
//     1 — COD               (paymentType = 'destination')
//     2 — Nacional contado  (paymentType = 'origin')
//
//   codtipobas:
//     0 — door-to-door (both paymentTypes)
//     4 — COD office pickup        (codservicio=1)
//     5 — Nacional contado office  (codservicio=2)
//
//   codtiposob:
//     0 — door-to-door (both paymentTypes)
//     1 — COD office pickup
//     2 — Nacional contado office
//
// The legacy `tipobas` / `tiposob` tables were one-row-per-codservicio (plus
// `siglas` for `tiposob`). With only two services in scope for the MVP, a
// hardcoded record is simpler than reintroducing a lookup table.

const SHIPPING_SERVICE_LEGACY_ID: Record<TPaymentType, number> = {
	origin: 2,
	destination: 1,
};

const OFFICE_BASE_TYPE_CODE: Record<TPaymentType, number> = {
	origin: 5,
	destination: 4,
};

const OFFICE_OVERWEIGHT_TYPE_CODE: Record<TPaymentType, number> = {
	origin: 2,
	destination: 1,
};

// LEGACY: `codservicio` for national guía. Only valid for the two services
// in scope (COD and Nacional contado) — international flows resolve their
// own service ids elsewhere.
export function resolveShippingServiceLegacyId(
	paymentType: TPaymentType,
): number {
	return SHIPPING_SERVICE_LEGACY_ID[paymentType];
}

export function resolveBaseTypeCode(
	paymentType: TPaymentType,
	destinationType: TDestinationType,
): number {
	if (destinationType === 'home') return 0;
	return OFFICE_BASE_TYPE_CODE[paymentType];
}

export function resolveOverweightTypeCode(
	paymentType: TPaymentType,
	destinationType: TDestinationType,
): number {
	if (destinationType === 'home') return 0;
	return OFFICE_OVERWEIGHT_TYPE_CODE[paymentType];
}
