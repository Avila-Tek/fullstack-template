import { Injectable } from '@nestjs/common';
import type { TValidateLockerQuery } from '@zoom/schemas';
import {
	type ValidateLockerResult,
	ValidateLockerUseCasePort,
} from '../ports/in/validate-locker.use-case.port';
import { LockerReaderPort } from '../ports/out/locker-reader.port';

/**
 * Predicate validator for `siglas + lockerNumber`. Mirrors the legacy
 * `getDatosCasillero` + `procesarFormCasillero` validation chain from
 * routing2702enproduccion.php, but consolidates the join chain into a single
 * adapter call (see `LockerReaderPort.findLockerForValidation` + Deviation 4).
 *
 * Returns a discriminated union — NEVER throws for validation failures. The
 * pricing engine (VS2/VS3) consumes the rich `{ valid: true, … }` shape
 * directly; the catalog validation endpoint (VS1.4 controller) strips it
 * down to `{ valid: boolean }` for the wire response.
 *
 * Validation order (matches spec_back.md §Task 3.1 steps 1–8):
 *   1. Adapter returns null   → NOT_FOUND
 *      (covers: locker doesn't exist, legacy_global_locker_id != 0,
 *      is_deleted = true — all filtered inside the adapter query).
 *   2. locker.is_active = false              → LOCKER_INACTIVE
 *   3. business_account.is_active = false    → CLIENT_INACTIVE
 *   4. shipping_service.family_code = 17     → INTERNATIONAL_FAMILY
 *   5. operating-office siglas empty/null    → OFFICE_NOT_CONFIGURED
 *   6. operating-office siglas != input      → NOT_FOUND (case-insensitive)
 *
 * Step 1 collapses the global-locker / deleted-locker case to NOT_FOUND
 * even though they could be distinguished internally — keeping the wire
 * response opaque per the security note in spec §"Public response status
 * codes". The `failureCode` discriminator is for logging only.
 */
@Injectable()
export class ValidateLockerUseCase implements ValidateLockerUseCasePort {
	constructor(private readonly lockerReader: LockerReaderPort) {}

	async execute(query: TValidateLockerQuery): Promise<ValidateLockerResult> {
		// 1. Lookup
		const data = await this.lockerReader.findLockerForValidation({
			legacyId: query.lockerNumber,
		});
		if (!data) {
			return { valid: false, failureCode: 'NOT_FOUND' };
		}

		// 2. Locker active?
		if (!data.lockerIsActive) {
			return { valid: false, failureCode: 'LOCKER_INACTIVE' };
		}

		// 3. Business account active?
		if (!data.businessAccountIsActive) {
			return { valid: false, failureCode: 'CLIENT_INACTIVE' };
		}

		// 4. International family? (codfamilia = 17 → out of scope for nacional)
		if (data.serviceFamilyCode === 17) {
			return { valid: false, failureCode: 'INTERNATIONAL_FAMILY' };
		}

		// 5. Operating office actually has siglas configured?
		const resolvedSiglas = data.operatingOfficeSiglas;
		if (resolvedSiglas === null || resolvedSiglas.length === 0) {
			return { valid: false, failureCode: 'OFFICE_NOT_CONFIGURED' };
		}

		// 6. Input siglas match? Case-insensitive — legacy `siglas` was
		//    canonically uppercase but the form input may not be normalized.
		if (resolvedSiglas.toUpperCase() !== query.siglas.toUpperCase()) {
			return { valid: false, failureCode: 'NOT_FOUND' };
		}

		// All checks pass — return the rich result.
		return {
			valid: true,
			lockerId: data.lockerId,
			lockerCode: data.lockerCode,
			siglas: resolvedSiglas,
			contactName: data.contactName,
			shippingServiceId: data.shippingServiceId,
			serviceCode: data.serviceCode,
			serviceName: data.serviceName,
			officeId: data.officeId,
			officeLegacyId: data.officeLegacyId,
			officeName: data.officeName,
			cityId: data.cityId,
			cityName: data.cityName,
			cityTransportChargeRuleId: data.cityTransportChargeRuleId,
		};
	}
}
