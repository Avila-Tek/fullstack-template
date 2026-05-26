/**
 * Result shape returned by `LockerReaderPort.findLockerForValidation`.
 *
 * Contains every joined column the locker-validation use case AND the pricing
 * engine need — packaged as a single flat object so the pricing flow doesn't
 * do a second round-trip after validation.
 *
 * LEGACY-DEVIATION: `cityTransportChargeRuleId` is denormalized from
 * `city_master.transport_charge_rule_id` so the pricing use case can look up
 * the transport-charge rule without holding a `region` schema reference.
 * Null when the destination city has no `transport_charge_rule_id` configured
 * (pricing falls back to `transportChargeAmount = 0`). See spec_back.md
 * "Deviation 4".
 */
export interface LockerValidationData {
	lockerId: string;
	lockerCode: number;
	lockerIsActive: boolean;
	// LEGACY: `casillero.contacto`. Surfaced on the rich result for use cases
	// that need to display the locker's contact name (e.g. pre-guía form).
	contactName: string | null;
	businessAccountIsActive: boolean;
	shippingServiceId: string;
	serviceCode: number;
	serviceName: string;
	serviceFamilyCode: number | null;
	officeId: string;
	// LEGACY: `oficina.codoficina` of the locker's office. Consumed by the
	// pricing use case (VS3 with-freight branch) as `destinationOfficeLegacyId`
	// when calling `resolveWeightTypeCode` — Branch 1 of the legacy
	// `_calculoTipoPeso` flow filters `office_master.legacy_id` against this.
	officeLegacyId: number;
	officeName: string;
	cityId: string;
	cityName: string;
	cityTransportChargeRuleId: string | null;
	operatingOfficeSiglas: string | null;
}

/**
 * LockerReaderPort — pricing's cross-module facade for locker validation.
 *
 * Per `apps/api/CLAUDE.md` rule 2, the abstract class is defined HERE
 * (pricing is the consumer) and implemented by the owning module
 * (`profiles`, which currently hosts `locker_master`, `office_master`, and
 * `business_account`; the joined `shipping_service_master` lives in
 * `catalog` after F1.1). The cross-module join is transparent to the caller.
 */
export abstract class LockerReaderPort {
	abstract findLockerForValidation(args: {
		legacyId: number;
	}): Promise<LockerValidationData | null>;
}
