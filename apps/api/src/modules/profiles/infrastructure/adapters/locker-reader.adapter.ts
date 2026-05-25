import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull, or, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { shippingServiceMaster } from '../../../catalog/infrastructure/persistence/shipping-service-master.schema';
import {
	LockerReaderPort,
	type LockerValidationData,
} from '../../../pricing/application/ports/out/locker-reader.port';
import { cityMaster } from '../../../region/infrastructure/persistence/city-master.schema';
import { businessAccount } from '../persistence/business-account.schema';
import { lockerMaster } from '../persistence/locker-master.schema';
import { officeMaster } from '../persistence/office-master.schema';

/**
 * Implements LockerReaderPort.findLockerForValidation by joining locker_master with
 * office_master (twice — locker office + operating office for siglas resolution),
 * business_account, shipping_service_master, and city_master in one query. Returns
 * the flat LockerValidationData shape (see pricing/application/ports/out/locker-reader.port.ts).
 *
 * LEGACY DEVIATION:
 * Legacy performs TWO round-trips per casillero quote:
 *   1. getDatosCasillero($codcasillero) — validates the locker and resolves the
 *      destination city + service (routing2702enproduccion.php L4534)
 *   2. Inside procesarFormCasillero (L11902), it then re-fetches the city to grab
 *      codtraslado: $ciudad = $controlador->ciudad->selectById($form['codciudaddes']);
 *
 * This adapter folds both reads into one. The `cityTransportChargeRuleId` field on
 * LockerValidationData carries the destination city's transport_charge_rule_id so the
 * pricing use case never needs a separate ciudad lookup. Pricing impact: zero — the
 * codtraslado value is identical. Architectural impact: pricing no longer touches
 * city_master directly, preserving R1 module boundaries (see apps/api/CLAUDE.md
 * "Module boundaries & loose coupling"). See spec.md "Deviation 4" for the full rationale.
 *
 * QUERY SHAPE (mirrors the legacy SQL from getDatosCasillero):
 *   FROM   locker_master
 *   JOIN   business_account             ON business_account.id = locker.business_account_id
 *   JOIN   shipping_service_master      ON shipping_service_master.id = locker.shipping_service_master_id
 *   JOIN   office_master AS locker_off  ON locker_off.id = locker.office_master_id
 *   JOIN   city_master                  ON city_master.id = locker_off.city_id
 *   LEFT JOIN office_master AS op_off   ON op_off.id = city_master.operating_office_id
 *   WHERE  locker.legacy_id = $legacyId
 *     AND (locker.legacy_global_locker_id IS NULL OR locker.legacy_global_locker_id = 0)
 *     AND locker.is_deleted = false
 *
 * The pre-filters on `legacy_global_locker_id` and `is_deleted` happen at the
 * SQL level so the use case never has to inspect them — they collapse to
 * NOT_FOUND naturally (the adapter returns null).
 *
 * MODULE BOUNDARY DEFERRAL (R1):
 * This adapter reads `shipping_service_master` (catalog) and `city_master`
 * (region) cross-module. Deferral matches the same pattern used by
 * `CatalogReaderAdapter` and disappears when those tables relocate per the
 * spec roadmap.
 */
@Injectable()
export class LockerReaderAdapter implements LockerReaderPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async findLockerForValidation(args: {
		legacyId: number;
	}): Promise<LockerValidationData | null> {
		const lockerOffice = officeMaster;
		const operatingOffice = sql`op_off`;

		const rows = await this.db
			.select({
				lockerId: lockerMaster.id,
				lockerCode: lockerMaster.legacyId,
				lockerIsActive: lockerMaster.isActive,
				contactName: lockerMaster.contactName,
				businessAccountStatus: businessAccount.status,
				shippingServiceId: shippingServiceMaster.id,
				serviceCode: shippingServiceMaster.legacyId,
				serviceName: shippingServiceMaster.name,
				serviceFamilyCode: shippingServiceMaster.familyCode,
				officeId: lockerOffice.id,
				officeLegacyId: lockerOffice.legacyId,
				officeName: lockerOffice.name,
				cityId: cityMaster.id,
				cityName: cityMaster.name,
				cityTransportChargeRuleId: cityMaster.transportChargeRuleId,
				// Operating office siglas — read via raw `sql` since Drizzle's
				// type system doesn't let us alias `officeMaster` twice in the
				// same query. The LEFT JOIN keyed by `op_off.id =
				// city_master.operating_office_id` is added below.
				operatingOfficeSiglas: sql<
					string | null
				>`${operatingOffice}.short_code`,
			})
			.from(lockerMaster)
			.innerJoin(
				businessAccount,
				eq(businessAccount.id, lockerMaster.businessAccountId),
			)
			.innerJoin(
				shippingServiceMaster,
				eq(shippingServiceMaster.id, lockerMaster.shippingServiceMasterId),
			)
			.innerJoin(lockerOffice, eq(lockerOffice.id, lockerMaster.officeMasterId))
			.innerJoin(cityMaster, eq(cityMaster.id, lockerOffice.cityId))
			.leftJoin(
				sql`${officeMaster} AS op_off`,
				sql`op_off.id = ${cityMaster.operatingOfficeId}`,
			)
			.where(
				and(
					eq(lockerMaster.legacyId, args.legacyId),
					or(
						isNull(lockerMaster.legacyGlobalLockerId),
						eq(lockerMaster.legacyGlobalLockerId, 0),
					),
					eq(lockerMaster.isDeleted, false),
				),
			)
			.limit(1);

		const row = rows[0];
		if (!row) {
			return null;
		}

		return {
			lockerId: row.lockerId,
			lockerCode: row.lockerCode,
			lockerIsActive: row.lockerIsActive,
			contactName: row.contactName ?? null,
			// `business_account.status` is `'active' | 'inactive'`; mapped to
			// the boolean shape the port surfaces.
			businessAccountIsActive: row.businessAccountStatus === 'active',
			shippingServiceId: row.shippingServiceId,
			serviceCode: row.serviceCode,
			serviceName: row.serviceName,
			serviceFamilyCode: row.serviceFamilyCode ?? null,
			officeId: row.officeId,
			officeLegacyId: row.officeLegacyId,
			officeName: row.officeName,
			cityId: row.cityId,
			cityName: row.cityName,
			cityTransportChargeRuleId: row.cityTransportChargeRuleId ?? null,
			operatingOfficeSiglas: row.operatingOfficeSiglas ?? null,
		};
	}
}
