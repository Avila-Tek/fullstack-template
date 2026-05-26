import { Inject, Injectable } from '@nestjs/common';
import { and, eq, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import {
	CatalogReaderPort,
	type CityContextRow,
	type ResolveWeightTypeCodeArgs,
	type TransitEstimateRow,
} from '../../../pricing/application/ports/out/catalog-reader.port';
// TEMPORARY R1 deferral — see "MODULE BOUNDARY DEFERRAL" note below.
import { officeMaster } from '../../../profiles/infrastructure/persistence/office-master.schema';
import { cityMaster } from '../../../region/infrastructure/persistence/city-master.schema';
import { shippingServiceMaster } from '../persistence/shipping-service-master.schema';
import { transitMatrix } from '../persistence/transit-matrix.schema';

/**
 * Resolves the `weight_type_code` for an origin → destination pair, matching
 * the legacy `_calculoTipoPeso` flow (routing2702enproduccion.php L16564–L16578)
 * byte-for-byte.
 *
 * LEGACY: `_calculoTipoPeso($codciudadori, $codoficinades, $codestaciondes, $codciudaddes)`
 *
 * Legacy has TWO branches; this adapter mirrors them exactly. There is NO
 * "direct city-pair" fallthrough — if neither branch fires, legacy returns
 * empty (collapsed to 0 by the primitive), and so do we.
 *
 *   BRANCH 1 — Casillero / no office flag (`!codoficinades`):
 *
 *     Legacy SQL (class.ciudad.php:46 `_codTipoPes`):
 *       SELECT origendestino.codtipopes
 *       FROM origendestino, oficina
 *       WHERE origendestino.codciudadori = $codciudadori
 *         AND origendestino.codciudaddes = oficina.codciudad
 *         AND oficina.codoficina = $codestaciondes
 *
 *     The legacy variable name `codestaciondes` is **misleading**: it looks
 *     like a station code, but every production caller assigns an office
 *     `codoficina` value to it. For Casillero this is verified at
 *     `routing2702enproduccion.php` L13448:
 *
 *       $casillero = $controlador->casillero->_getDatosCasilleroglo($codcasillero);
 *       $form['codestaciondes'] = $casillero->fields['codoficina'];   // ← office id
 *
 *     So Branch 1 filters by office `codoficina` — which in the new schema
 *     is `office_master.legacy_id`. The port field is named accordingly
 *     (`destinationOfficeLegacyId`).
 *
 *     (One outlier exists at L9163 inside `validarGuiaPrepagada` which does
 *     assign `$codoficina['codestacioncub']` to `codestaciondes` — but that
 *     flow calls `_codTipoPes` directly, not `_calculoTipoPeso`, so it
 *     doesn't reach this adapter.)
 *
 *   BRANCH 2 — Office-pickup flag (`$codoficinades` truthy):
 *
 *     Legacy PHP:
 *       $oficina = $ciudad->getOne('codoficinaope', "codciudad='$codciudaddes'");
 *       $codtipopes = $ciudad->_codTipoPes($codciudadori, $oficina);
 *
 *     `codoficinades` is used ONLY as a FLAG — its value is never read.
 *     The actual office that drives the transit lookup is the operating
 *     office (`codoficinaope`) of the destination city. The transit row
 *     looked up is then `(origin → that operating office's city)`.
 *
 *     In well-formed data the operating office of city X lives in city X,
 *     so the lookup effectively becomes `(origin → destination city)`.
 *     The indirection only matters when a city defers operations to a
 *     neighbouring city's office — legacy uses that neighbouring city as
 *     the transit destination, and this adapter does the same.
 *
 * Legacy collapses every "row not found" outcome to `codtipopes = 0`:
 *
 *   if (@empty($codtipopes)) $codtipopes = 0;
 *
 * This adapter returns `null` on miss; `resolve-weight-type-code.ts` applies
 * the `null → 0` collapse so the data layer keeps an honest signal while
 * callers get legacy-parity behavior.
 *
 * MODULE BOUNDARY DEFERRAL (R1):
 * This adapter reads `office_master` (owned by `profiles`) and `city_master`
 * (owned by `region`) — both strict R1 violations under
 * `apps/api/CLAUDE.md`. The deferral is deliberate per spec_back.md
 * §"Phase 2 Task 2.2 Scope note":
 *
 *   > Future stories (S-001 Nacional pricing, S-003 Internacional) will
 *   > extend `ICatalogReader` with additional methods … and may eventually
 *   > relocate `shipping_service_master`, `office_master`, and
 *   > `locker_master` into the catalog module proper.
 *
 * When that relocation lands, the imports become same-module sibling
 * imports and the deferral goes away. Reads here are SELECT-only and
 * limited to `(id, city_id, legacy_id, operating_office_id)`,
 * minimizing coupling.
 */
@Injectable()
export class CatalogReaderAdapter implements CatalogReaderPort {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {}

	async resolveWeightTypeCode(
		args: ResolveWeightTypeCodeArgs,
	): Promise<number | null> {
		if (args.recipientType === 'guia') {
			// ---------------------------------------------------------------
			// Operating-office indirection through the destination city.
			// Legacy: `$ciudad->getOne('codoficinaope', "codciudad=…")`
			// followed by `_codTipoPes($codciudadori, $oficina)`.
			// ---------------------------------------------------------------
			const rows = await this.db
				.select({ weightTypeCode: transitMatrix.weightTypeCode })
				.from(transitMatrix)
				.innerJoin(cityMaster, eq(cityMaster.id, args.destinationCityId))
				.innerJoin(
					officeMaster,
					// SAFETY: `eq` with `cityMaster.operatingOfficeId` (nullable column)
					// would fail to compile because Drizzle infers the RHS type as
					// `string | null` and rejects the join condition. We use raw `sql`
					// to express the equality. Postgres treats a NULL operating-office
					// id as NULL on both sides → the row is filtered out, matching
					// legacy `getOne(...)` returning empty when no operating office.
					sql`${officeMaster.id} = ${cityMaster.operatingOfficeId}`,
				)
				.where(
					and(
						eq(transitMatrix.originCityId, args.originCityId),
						eq(transitMatrix.destinationCityId, officeMaster.cityId),
						eq(transitMatrix.isActive, true),
					),
				)
				.limit(1);
			return rows[0]?.weightTypeCode ?? null;
		}

		// -----------------------------------------------------------------
		// `recipientType === 'locker'` — Casillero path: caller already
		// knows the destination office's `codoficina`. Legacy:
		// `_codTipoPes($codciudadori, $codestaciondes)` where
		// `$codestaciondes` is an office `codoficina` value (verified at
		// `routing2702enproduccion.php` L13448).
		// -----------------------------------------------------------------
		const rows = await this.db
			.select({ weightTypeCode: transitMatrix.weightTypeCode })
			.from(transitMatrix)
			.innerJoin(
				officeMaster,
				eq(officeMaster.legacyId, args.destinationOfficeLegacyId),
			)
			.where(
				and(
					eq(transitMatrix.originCityId, args.originCityId),
					eq(transitMatrix.destinationCityId, officeMaster.cityId),
					eq(transitMatrix.isActive, true),
				),
			)
			.limit(1);
		return rows[0]?.weightTypeCode ?? null;
	}

	// LEGACY: `origendestino.diasadimer` / `origendestino.diasadidoc`. Returns
	// the SLA estimate row for the origin/destination pair, or null when no
	// active matrix entry exists. AC-06 is non-blocking — the use case treats
	// `null` as "no estimate" and continues with pricing.
	async findTransitEstimate(args: {
		originCityId: string;
		destinationCityId: string;
	}): Promise<TransitEstimateRow | null> {
		const rows = await this.db
			.select({
				merchandiseDays: transitMatrix.merchandiseDays,
				documentDays: transitMatrix.documentDays,
			})
			.from(transitMatrix)
			.where(
				and(
					eq(transitMatrix.originCityId, args.originCityId),
					eq(transitMatrix.destinationCityId, args.destinationCityId),
					eq(transitMatrix.isActive, true),
				),
			)
			.limit(1);
		return rows[0] ?? null;
	}

	// LEGACY: `shipping_service_master.legacy_id` is the equivalent of the
	// legacy `codservicio` integer. The Nacional pricing use case calls this
	// once at the start to translate `codservicio` (derived from
	// `paymentType`) into the UUID expected by the shared primitives that
	// hit `national_overweight_rule` / `postal_tax_rule`.
	async findShippingServiceIdByLegacyId(
		legacyId: number,
	): Promise<string | null> {
		const rows = await this.db
			.select({ id: shippingServiceMaster.id })
			.from(shippingServiceMaster)
			.where(eq(shippingServiceMaster.legacyId, legacyId))
			.limit(1);
		return rows[0]?.id ?? null;
	}

	// LEGACY: bundled lookup of `ciudad.pesomax`, `ciudad.cod`,
	// `ciudad.noentregapap`, `ciudad.codoficinaope`, and the city's transport
	// charge rule — replacing four separate legacy queries. Returns null when
	// the city does not exist; callers map that to `RouteNotFoundException`.
	// Numeric `max_weight_kg` is coerced to a JS number, booleans default to
	// `false` when null in the DB (matches legacy "no flag = disabled").
	async findCityContext(args: {
		cityId: string;
	}): Promise<CityContextRow | null> {
		const rows = await this.db
			.select({
				id: cityMaster.id,
				legacyId: cityMaster.legacyId,
				maxWeightKg: cityMaster.maxWeightKg,
				supportsCod: cityMaster.supportsCod,
				paperDeliveryDisabled: cityMaster.paperDeliveryDisabled,
				operatingOfficeId: cityMaster.operatingOfficeId,
				transportChargeRuleId: cityMaster.transportChargeRuleId,
			})
			.from(cityMaster)
			.where(eq(cityMaster.id, args.cityId))
			.limit(1);
		const row = rows[0];
		if (!row) return null;
		const maxWeightKgRaw = row.maxWeightKg;
		const maxWeightKg =
			maxWeightKgRaw === null || maxWeightKgRaw === undefined
				? 0
				: Number(maxWeightKgRaw);
		return {
			id: row.id,
			legacyId: row.legacyId,
			maxWeightKg: Number.isFinite(maxWeightKg) ? maxWeightKg : 0,
			supportsCod: row.supportsCod ?? false,
			paperDeliveryDisabled: row.paperDeliveryDisabled ?? false,
			operatingOfficeId: row.operatingOfficeId,
			transportChargeRuleId: row.transportChargeRuleId,
		};
	}
}
