/**
 * Seed script — bootstraps master-table data for local development.
 *
 * ⚠️  TEMPORARY: This seed exists only until a proper ETL migration from the
 * legacy system is in place. Once the sync pipeline for master tables is live,
 * this file should be deleted and replaced by the migration scripts.
 *
 * Safe to run multiple times (idempotent — select-first, insert only if absent).
 * Wraps the work in a session-scoped pg advisory lock so concurrent Cloud Run
 * instances cannot race on inserts at startup.
 *
 * Order of operations (per spec_back §1.8.11 dependency chain):
 *   1.  country_master              — Venezuela
 *   2.  state_master                — Distrito Capital (legacyId=2) + 5 new states (F3.2)
 *   3.  municipality_master         — Libertador
 *   4.  transport_charge_rule       — 14 rows from traslado.csv (F3.4)
 *   5.  office_master (pass 1)      — CCS (legacyId=46) + 5 real (F3.3) + 4 fictional (F3.6),
 *                                     city_id=null pending pass 2
 *   6.  city_master                 — Caracas (legacyId=19) + 5 real (F3.3) + 4 fictional (F3.6),
 *                                     operatingOfficeId=null pending pass 2
 *   6b. Anzoátegui geography        — state (legacyId=9000) + municipalities Simón Rodríguez
 *                                     (9001) + Diego Bautista Urbaneja (9003) + cities El Tigre
 *                                     (9002) + Lechería (9004)
 *   7.  Second pass updates         — fill office.cityId
 *   8.  document_type_master        — 5 document types from documento.csv
 *   9.  phone_prefix_master         — 6 carrier prefixes (domestic)
 *   9b. phone_prefix_master (intl)  — international country code prefixes
 *   10. unit_of_measure_master      — LB, CM
 *   11. return_type_master          — 2 entries (devolución a domicilio, destruir)
 *   12. shipping_service_master     — 37 real services from servicio.csv (F3.8)
 *   13. transit_matrix              — 36 origendestino.csv rows where origin AND destination
 *                                     in {19,40,29,16,25,33} + 20 fictional rows (F3.5/F3.6)
 *   14. postal_tax_rule             — 8 tasapos.csv rows for codservicio in
 *                                     {17,18,21,41,50,75,76,90,93,94,102} (F3.5)
 *   15. national_overweight_rule    — 24 sobrepesonac.csv rows for codservicio in {21,41} +
 *                                     2 fictional rows for codservicio 75/76 (F3.5/F3.7)
 *   16. insurance_rule              — 3 most-recent-date rows from seguro.csv (F3.5)
 *   17. national_base_rate          — 32 most-recent rows from basiconac.csv for codservicio ∈ {1,2} (E-006 S-001)
 *   18. commission_rule             — 1 real + 2 fictional rows from comision.csv (E-006 S-001)
 *   19. route_master                — 10 routes, one per seeded office (E-006 S-001)
 *   20. national_overweight_rule    — 48 additional rows for codservicio ∈ {1,2} (E-006 S-001)
 *   21. postal_tax_rule             — 4 additional rows for codservicio ∈ {1,2} (E-006 S-001)
 *   22. permission_catalog          — share_guide_recipients, share_locker_recipients, view_reports
 *   23. role_template               — admin, operator
 *   24. role_template_service       — template × service-enum-key defaults
 *   25. role_template_permission    — template × permission defaults
 *   26. locker_master               — env-driven (SEED_LOCKER_BUSINESS_ACCOUNT_IDS), round-robin
 *                                     across offices, alternating codservicio 18/21 (F3.9)
 *
 * All seed data is inline (no runtime CSV reads). Source CSVs in `table_data/`
 * remain the canonical reference — values here mirror them but the seed does
 * not depend on those files at runtime.
 *
 * Required env vars:
 *   DATABASE_URL                          PostgreSQL connection string
 *
 * Optional env vars:
 *   SEED_LOCKER_BUSINESS_ACCOUNT_IDS      Comma-separated business_account UUIDs (see F3.10)
 */

import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { env, loadEnv } from '../env';
import { routeMaster } from '../modules/catalog/infrastructure/persistence/route-master.schema';
import { shippingServiceMaster } from '../modules/catalog/infrastructure/persistence/shipping-service-master.schema';
import { transitMatrix } from '../modules/catalog/infrastructure/persistence/transit-matrix.schema';
import { commissionRule } from '../modules/pricing/infrastructure/persistence/commission-rule.schema';
import { insuranceRule } from '../modules/pricing/infrastructure/persistence/insurance-rule.schema';
import { nationalBaseRate } from '../modules/pricing/infrastructure/persistence/national-base-rate.schema';
import { nationalOverweightRule } from '../modules/pricing/infrastructure/persistence/national-overweight-rule.schema';
import { postalTaxRule } from '../modules/pricing/infrastructure/persistence/postal-tax-rule.schema';
import { transportChargeRule } from '../modules/pricing/infrastructure/persistence/transport-charge-rule.schema';
import { businessAccount } from '../modules/profiles/infrastructure/persistence/business-account.schema';
import { documentTypeMaster } from '../modules/profiles/infrastructure/persistence/document-type-master.schema';
import { lockerMaster } from '../modules/profiles/infrastructure/persistence/locker-master.schema';
import { officeMaster } from '../modules/profiles/infrastructure/persistence/office-master.schema';
import { phonePrefixMaster } from '../modules/profiles/infrastructure/persistence/phone-prefix-master.schema';
import { returnTypeMaster } from '../modules/profiles/infrastructure/persistence/return-type-master.schema';
import { roleTemplate } from '../modules/profiles/infrastructure/persistence/role-template.schema';
import { shippingServiceKeyEnum } from '../modules/profiles/infrastructure/persistence/shipping-service-enums.schema';
import { unitOfMeasureMaster } from '../modules/profiles/infrastructure/persistence/unit-of-measure-master.schema';
import { cityMaster } from '../modules/region/infrastructure/persistence/city-master.schema';
import { countryMaster } from '../modules/region/infrastructure/persistence/country-master.schema';
import { municipalityMaster } from '../modules/region/infrastructure/persistence/municipality-master.schema';
import { stateMaster } from '../modules/region/infrastructure/persistence/state-master.schema';
import { permissionCatalog } from '../modules/role-templates/infrastructure/persistence/permission-catalog.schema';
import { roleTemplatePermission } from '../modules/role-templates/infrastructure/persistence/role-template-permission.schema';
import { roleTemplateService } from '../modules/role-templates/infrastructure/persistence/role-template-service.schema';

// Stable advisory-lock key for the seed script (any unique BIGINT works).
const SEED_ADVISORY_LOCK_KEY = 731_197_331_198n;

// ---------------------------------------------------------------------------
// Inline data (mirrors `table_data/*.csv`; see file header for sources)
// ---------------------------------------------------------------------------

const DOCUMENT_TYPES = [
	{ legacyId: 1, code: 'V', name: 'Venezolano' },
	{ legacyId: 2, code: 'E', name: 'Extranjero' },
	{ legacyId: 3, code: 'J', name: 'Jurídico' },
	{ legacyId: 4, code: 'G', name: 'Gubernamental' },
	{ legacyId: 5, code: 'P', name: 'Pasaporte' },
] as const;

const UNITS_OF_MEASURE = [
	{ legacyId: 1, code: 'LB', name: 'Libra', unitTypeCode: 1 },
	{ legacyId: 2, code: 'CM', name: 'Centímetro', unitTypeCode: 2 },
] as const;

const RETURN_TYPES = [
	{ legacyId: 1, name: 'Devolución a domicilio', isWebVisible: true },
	{ legacyId: 7, name: 'Destruir', isWebVisible: true },
] as const;

// F3.2 — 5 new Venezuelan states from estado.csv (parents of the F3.3 cities).
const NEW_STATES = [
	{
		legacyId: 4,
		name: 'Guárico',
		shortCode: 'VE-J',
		regionCode: 2,
		bcvStateCode: 12,
		ipostelStateCode: 12,
		latitude: '8.924160',
		longitude: '-67.429290',
	},
	{
		legacyId: 11,
		name: 'Portuguesa',
		shortCode: 'VE-P',
		regionCode: 2,
		bcvStateCode: 18,
		ipostelStateCode: 18,
		latitude: '9.554510',
		longitude: '-69.195640',
	},
	{
		legacyId: 13,
		name: 'Táchira',
		shortCode: 'VE-S',
		regionCode: 5,
		bcvStateCode: 20,
		ipostelStateCode: 20,
		latitude: '7.814540',
		longitude: '-72.443100',
	},
	{
		legacyId: 16,
		name: 'Zulia',
		shortCode: 'VE-V',
		regionCode: 3,
		bcvStateCode: 23,
		ipostelStateCode: 23,
		latitude: '10.631670',
		longitude: '-71.640560',
	},
	{
		legacyId: 21,
		name: 'Barinas',
		shortCode: 'VE-E',
		regionCode: 5,
		bcvStateCode: 6,
		ipostelStateCode: 6,
		latitude: '8.622610',
		longitude: '-70.207490',
	},
] as const;

// F3.3 — 5 real Venezuelan cities + their operating offices.
const REAL_CITIES = [
	{
		legacyId: 40,
		name: 'Valle de la Pascua',
		stateLegacyId: 4,
		officeLegacyId: 889,
		officeName: 'ZOOM VALLE DE LA PASCUA',
		officeSiglas: 'VLP',
		maxWeightKg: '1.000',
		categoryCode: 6,
	},
	{
		legacyId: 29,
		name: 'Cabimas',
		stateLegacyId: 16,
		officeLegacyId: 4113,
		officeName: 'ZOOM CABIMAS',
		officeSiglas: 'CAB',
		maxWeightKg: '200.000',
		categoryCode: 5,
	},
	{
		legacyId: 16,
		name: 'San Antonio del Táchira',
		stateLegacyId: 13,
		officeLegacyId: 112,
		officeName: 'ZOOM SAN ANTONIO',
		officeSiglas: 'SAT',
		maxWeightKg: '3000000.000',
		categoryCode: 6,
	},
	{
		legacyId: 25,
		name: 'Acarigua',
		stateLegacyId: 11,
		officeLegacyId: 2,
		officeName: 'ZOOM ACARIGUA',
		officeSiglas: 'AGV',
		maxWeightKg: '200.000',
		categoryCode: 4,
	},
	{
		legacyId: 33,
		name: 'Barinas',
		stateLegacyId: 21,
		officeLegacyId: 6,
		officeName: 'ZOOM BARINAS',
		officeSiglas: 'BNS',
		maxWeightKg: '200.000',
		categoryCode: 5,
	},
] as const;

// F3.6 — 4 fictional cities + offices covering specific test scenarios.
// All live in Distrito Capital (codestado=2) and reference Venezuela (codpais=124).
const FICTIONAL_CITIES = [
	{
		legacyId: 90001,
		name: 'Prueba — Casillero con Traslado Bajo (1.121,88 Bs)',
		officeLegacyId: 90001,
		officeName: 'Oficina de Prueba — Traslado Bajo',
		officeSiglas: 'TRB' as string | null,
		transportChargeLegacyId: 1,
		nationalVatRate: '16',
		nationalSurchargeRate: '0',
	},
	{
		legacyId: 90002,
		name: 'Prueba — Casillero con Traslado Alto (3.814,40 Bs)',
		officeLegacyId: 90002,
		officeName: 'Oficina de Prueba — Traslado Alto',
		officeSiglas: 'TRA' as string | null,
		transportChargeLegacyId: 13,
		nationalVatRate: '16',
		nationalSurchargeRate: '0',
	},
	{
		legacyId: 90003,
		name: 'Prueba — IVA Nacional 0% con Complemento 16%',
		officeLegacyId: 90003,
		officeName: 'Oficina de Prueba — IVA Exento',
		officeSiglas: 'IEX' as string | null,
		transportChargeLegacyId: 0,
		nationalVatRate: '0',
		nationalSurchargeRate: '16',
	},
	{
		legacyId: 90004,
		name: 'Prueba — Casillero Inválido por Oficina sin Siglas',
		officeLegacyId: 90004,
		officeName: 'Oficina de Prueba sin Siglas',
		officeSiglas: null as string | null, // DB NULL — see spec §1.8.6
		transportChargeLegacyId: 0,
		nationalVatRate: '16',
		nationalSurchargeRate: '0',
	},
] as const;

// F3.4 — 14 transport_charge_rule rows from traslado.csv.
const TRANSPORT_CHARGES: ReadonlyArray<{ legacyId: number; amount: string }> = [
	{ legacyId: 0, amount: '0.00' },
	{ legacyId: 1, amount: '1121.88' },
	{ legacyId: 2, amount: '1346.26' },
	{ legacyId: 3, amount: '1570.63' },
	{ legacyId: 4, amount: '1795.01' },
	{ legacyId: 5, amount: '2019.39' },
	{ legacyId: 6, amount: '2243.76' },
	{ legacyId: 7, amount: '2468.14' },
	{ legacyId: 8, amount: '2692.51' },
	{ legacyId: 9, amount: '2916.89' },
	{ legacyId: 10, amount: '3141.27' },
	{ legacyId: 11, amount: '3365.64' },
	{ legacyId: 12, amount: '3590.02' },
	{ legacyId: 13, amount: '3814.40' },
];

// F3.7 — 2 fictional national_overweight_rule rows for codservicio 75/76.
// Bridges the sobrepesonac.csv data gap for the per-trip variants of
// MEDIO PUNTO and PUNTO A PUNTO. Replace with real catalog rows when
// production sync runs.
const FICTIONAL_OVERWEIGHT_RULES = [
	// FICTIONAL: bridges sobrepesonac sample-data gap for codservicio 75
	// (MEDIO PUNTO POR VIAJE). See spec.md Task 1.8.7.
	{
		legacyId: 99975,
		serviceLegacyId: 75,
		weightTypeCode: 1,
		minWeightKg: '1.000',
		maxWeightKg: '999999.000',
		overweightAmount: '416.37',
		overweightTypeCode: 0,
	},
	// FICTIONAL: bridges sobrepesonac sample-data gap for codservicio 76
	// (PUNTO A PUNTO POR VIAJE). Same context as 99975.
	{
		legacyId: 99976,
		serviceLegacyId: 76,
		weightTypeCode: 1,
		minWeightKg: '1.000',
		maxWeightKg: '999999.000',
		overweightAmount: '416.37',
		overweightTypeCode: 0,
	},
] as const;

// F3.8 — 37 real shipping services mirroring servicio.csv. Captures the
// columns S-002 and the broader catalog need; `family_code` is critical for
// the casillero validation (family_code = 17 → international, blocked).
//
// Boolean source columns: True/False in the CSV map to true/false here; the
// inline list omits the few columns servicio.csv exposes that no S-002 path
// reads (codusuario, fechausu, horausu, codbiservicio, fechamig, tarifaplana,
// webcasillero, nombre2, codservicio_ipostel).
const SHIPPING_SERVICES_FROM_CSV: ReadonlyArray<{
	legacyId: number;
	name: string;
	shortCode: string | null;
	secondaryShortCode: string | null;
	salesOrganization: string | null;
	isLockerService: boolean;
	requiresManifest: boolean;
	availableAtCounter: boolean;
	isNational: boolean;
	inboundInternational: boolean | null;
	outboundInternational: boolean | null;
	supportsEffectiveness: boolean | null;
	initializeOnCreation: boolean | null;
	usesCorrelativePq: boolean | null;
	usesTemplateGuide: boolean | null;
	usesNationalBaseRate: boolean | null;
	usesInternationalBaseRate: boolean | null;
	usesNationalOverweight: boolean | null;
	usesInternationalOverweight: boolean | null;
	usesPostalTax: boolean | null;
	familyCode: number | null;
	serviceTypeCode: number | null;
	paymentTypeCode: number | null;
	pricingFamilyTypeCode: number | null;
	serviceUsageTypeCode: number | null;
	deliveryShortCode: string | null;
	guideCloseTypeCode: number | null;
	migrationServiceLegacyId: number | null;
	isActive: boolean;
}> = [
	{
		legacyId: 105,
		name: 'DISTRIBUCION MASIVA INTERNACIONAL',
		shortCode: 'MSI',
		secondaryShortCode: 'MSI',
		salesOrganization: null,
		isLockerService: false,
		requiresManifest: true,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: false,
		initializeOnCreation: false,
		usesCorrelativePq: true,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: false,
		usesNationalOverweight: true,
		usesInternationalOverweight: false,
		usesPostalTax: false,
		familyCode: 11,
		serviceTypeCode: null,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 3,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'INTERNACIONAL',
		guideCloseTypeCode: 0,
		migrationServiceLegacyId: 0,
		isActive: true,
	},
	{
		legacyId: 82,
		name: 'ENVIOS INTERNACIONALES',
		shortCode: 'EI',
		secondaryShortCode: 'EI',
		salesOrganization: null,
		isLockerService: false,
		requiresManifest: false,
		availableAtCounter: false,
		isNational: false,
		inboundInternational: null,
		outboundInternational: null,
		supportsEffectiveness: false,
		initializeOnCreation: null,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 0,
		serviceTypeCode: null,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 4,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'INTERNACIONAL',
		guideCloseTypeCode: 0,
		migrationServiceLegacyId: 0,
		isActive: true,
	},
	{
		legacyId: 60,
		name: 'MENSAJERIA',
		shortCode: 'BSM',
		secondaryShortCode: null,
		salesOrganization: null,
		isLockerService: false,
		requiresManifest: false,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: null,
		outboundInternational: null,
		supportsEffectiveness: false,
		initializeOnCreation: null,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 0,
		serviceTypeCode: null,
		paymentTypeCode: null,
		pricingFamilyTypeCode: 5,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 0,
		migrationServiceLegacyId: 0,
		isActive: true,
	},
	{
		legacyId: 52,
		name: 'COD INTERNACIONAL',
		shortCode: 'CDI',
		secondaryShortCode: '',
		salesOrganization: '',
		isLockerService: false,
		requiresManifest: true,
		availableAtCounter: false,
		isNational: false,
		inboundInternational: true,
		outboundInternational: false,
		supportsEffectiveness: true,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: true,
		usesNationalOverweight: true,
		usesInternationalOverweight: true,
		usesPostalTax: null,
		familyCode: 53,
		serviceTypeCode: 2,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 4,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'INTERNACIONAL',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 7,
		isActive: true,
	},
	{
		legacyId: 99,
		name: 'ENVIO MARITIMO INTERNACIONAL',
		shortCode: 'EMI',
		secondaryShortCode: 'EMI',
		salesOrganization: 'OV07',
		isLockerService: false,
		requiresManifest: true,
		availableAtCounter: true,
		isNational: false,
		inboundInternational: true,
		outboundInternational: true,
		supportsEffectiveness: true,
		initializeOnCreation: false,
		usesCorrelativePq: true,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 82,
		serviceTypeCode: 1,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 4,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'INTERNACIONAL',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 15,
		isActive: true,
	},
	{
		legacyId: 92,
		name: 'ENVIO INTERNACIONAL -TODO INCLUIDO- MIAMI',
		shortCode: 'ZGF',
		secondaryShortCode: 'ZGF',
		salesOrganization: 'OV07',
		isLockerService: false,
		requiresManifest: true,
		availableAtCounter: true,
		isNational: false,
		inboundInternational: true,
		outboundInternational: true,
		supportsEffectiveness: true,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: true,
		usesNationalOverweight: true,
		usesInternationalOverweight: true,
		usesPostalTax: true,
		familyCode: 82,
		serviceTypeCode: 1,
		paymentTypeCode: null,
		pricingFamilyTypeCode: 4,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'INTERNACIONAL',
		guideCloseTypeCode: 92,
		migrationServiceLegacyId: 3,
		isActive: true,
	},
	{
		legacyId: 17,
		name: 'CASILLERO INTERNACIONAL',
		shortCode: 'BCI',
		secondaryShortCode: 'BCI',
		salesOrganization: '',
		isLockerService: true,
		requiresManifest: true,
		availableAtCounter: false,
		isNational: false,
		inboundInternational: true,
		outboundInternational: true,
		supportsEffectiveness: true,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 0,
		serviceTypeCode: null,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 1,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'CASILLERO',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 17,
		isActive: true,
	},
	{
		legacyId: 94,
		name: 'DEVOLUCION DE CASILLERO',
		shortCode: 'DEV',
		secondaryShortCode: 'DEV',
		salesOrganization: null,
		isLockerService: true,
		requiresManifest: true,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: true,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: true,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: false,
		usesNationalOverweight: true,
		usesInternationalOverweight: false,
		usesPostalTax: true,
		familyCode: 0,
		serviceTypeCode: 1,
		paymentTypeCode: null,
		pricingFamilyTypeCode: 3,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'CASILLERO',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 23,
		isActive: true,
	},
	{
		legacyId: 75,
		name: 'MEDIO PUNTO POR VIAJE',
		shortCode: 'BMP',
		secondaryShortCode: 'BCN',
		salesOrganization: 'OV07',
		isLockerService: true,
		requiresManifest: false,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: true,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 18,
		serviceTypeCode: null,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 1,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'CASILLERO',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 8,
		isActive: true,
	},
	{
		legacyId: 76,
		name: 'PUNTO A PUNTO POR VIAJE',
		shortCode: 'BPP',
		secondaryShortCode: 'BCN',
		salesOrganization: 'OV07',
		isLockerService: true,
		requiresManifest: false,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: true,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 18,
		serviceTypeCode: null,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 1,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'CASILLERO',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 8,
		isActive: true,
	},
	{
		legacyId: 59,
		name: 'MATERIAL DE EMBALAJE',
		shortCode: 'ZPK',
		secondaryShortCode: null,
		salesOrganization: null,
		isLockerService: false,
		requiresManifest: false,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: null,
		outboundInternational: null,
		supportsEffectiveness: false,
		initializeOnCreation: null,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 0,
		serviceTypeCode: null,
		paymentTypeCode: null,
		pricingFamilyTypeCode: 6,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 0,
		migrationServiceLegacyId: 0,
		isActive: true,
	},
	{
		legacyId: 63,
		name: 'RECOLECTA NACIONAL',
		shortCode: 'BRN',
		secondaryShortCode: null,
		salesOrganization: null,
		isLockerService: false,
		requiresManifest: true,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: null,
		outboundInternational: null,
		supportsEffectiveness: false,
		initializeOnCreation: null,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 0,
		serviceTypeCode: null,
		paymentTypeCode: null,
		pricingFamilyTypeCode: 5,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 4,
		migrationServiceLegacyId: 21,
		isActive: true,
	},
	{
		legacyId: 88,
		name: 'AUTO FACTURA',
		shortCode: 'AUT',
		secondaryShortCode: '',
		salesOrganization: '',
		isLockerService: false,
		requiresManifest: false,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: false,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: false,
		usesInternationalBaseRate: false,
		usesNationalOverweight: false,
		usesInternationalOverweight: false,
		usesPostalTax: false,
		familyCode: 0,
		serviceTypeCode: 0,
		paymentTypeCode: 0,
		pricingFamilyTypeCode: 0,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 0,
		migrationServiceLegacyId: 0,
		isActive: true,
	},
	{
		legacyId: 57,
		name: 'GUIA NACIONAL',
		shortCode: 'BGN',
		secondaryShortCode: 'BGN',
		salesOrganization: null,
		isLockerService: false,
		requiresManifest: false,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: null,
		outboundInternational: null,
		supportsEffectiveness: false,
		initializeOnCreation: null,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 0,
		serviceTypeCode: null,
		paymentTypeCode: null,
		pricingFamilyTypeCode: 3,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 0,
		migrationServiceLegacyId: 1,
		isActive: true,
	},
	{
		legacyId: 53,
		name: 'COD',
		shortCode: 'COD',
		secondaryShortCode: null,
		salesOrganization: null,
		isLockerService: false,
		requiresManifest: false,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: null,
		outboundInternational: null,
		supportsEffectiveness: false,
		initializeOnCreation: null,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 0,
		serviceTypeCode: null,
		paymentTypeCode: null,
		pricingFamilyTypeCode: 3,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 5,
		isActive: true,
	},
	{
		legacyId: 89,
		name: 'COD ALTO VALOR',
		shortCode: 'CDI',
		secondaryShortCode: '',
		salesOrganization: '',
		isLockerService: false,
		requiresManifest: false,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: false,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: false,
		usesInternationalBaseRate: false,
		usesNationalOverweight: false,
		usesInternationalOverweight: false,
		usesPostalTax: false,
		familyCode: 0,
		serviceTypeCode: 0,
		paymentTypeCode: 0,
		pricingFamilyTypeCode: 0,
		serviceUsageTypeCode: 0,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 5,
		isActive: true,
	},
	{
		legacyId: 55,
		name: 'ENVIO NACIONAL',
		shortCode: 'BGP',
		secondaryShortCode: 'BGN',
		salesOrganization: null,
		isLockerService: false,
		requiresManifest: false,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: null,
		outboundInternational: null,
		supportsEffectiveness: false,
		initializeOnCreation: null,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 0,
		serviceTypeCode: null,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 3,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 0,
		migrationServiceLegacyId: 2,
		isActive: true,
	},
	{
		legacyId: 93,
		name: 'DEVOLUCION',
		shortCode: 'DEV',
		secondaryShortCode: 'DEV',
		salesOrganization: null,
		isLockerService: false,
		requiresManifest: true,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: true,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: true,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: false,
		usesNationalOverweight: true,
		usesInternationalOverweight: false,
		usesPostalTax: true,
		familyCode: 0,
		serviceTypeCode: 1,
		paymentTypeCode: null,
		pricingFamilyTypeCode: 3,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 22,
		isActive: true,
	},
	{
		legacyId: 78,
		name: 'TARJETAS DE CREDITO',
		shortCode: 'TC',
		secondaryShortCode: '',
		salesOrganization: 'OV07',
		isLockerService: false,
		requiresManifest: true,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: false,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: null,
		usesInternationalOverweight: null,
		usesPostalTax: true,
		familyCode: 11,
		serviceTypeCode: null,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 3,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 1,
		migrationServiceLegacyId: 12,
		isActive: true,
	},
	{
		legacyId: 79,
		name: 'TARJETAS DE CREDITO PROMOCIONAL',
		shortCode: 'TP',
		secondaryShortCode: null,
		salesOrganization: 'OV07',
		isLockerService: false,
		requiresManifest: true,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: false,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: false,
		usesInternationalBaseRate: false,
		usesNationalOverweight: false,
		usesInternationalOverweight: false,
		usesPostalTax: false,
		familyCode: 11,
		serviceTypeCode: 0,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 3,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 1,
		migrationServiceLegacyId: 12,
		isActive: true,
	},
	{
		legacyId: 81,
		name: 'DISTRIBUCION MASIVO EXPRESO',
		shortCode: 'MSE',
		secondaryShortCode: '',
		salesOrganization: 'OV07',
		isLockerService: false,
		requiresManifest: true,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: false,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: null,
		usesInternationalBaseRate: null,
		usesNationalOverweight: null,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 11,
		serviceTypeCode: null,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 3,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 2,
		migrationServiceLegacyId: 12,
		isActive: true,
	},
	{
		legacyId: 91,
		name: 'MASIVO FACTURA NACIONAL',
		shortCode: 'MFN',
		secondaryShortCode: '',
		salesOrganization: 'OV07',
		isLockerService: false,
		requiresManifest: true,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: false,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: false,
		usesNationalOverweight: true,
		usesInternationalOverweight: false,
		usesPostalTax: false,
		familyCode: 11,
		serviceTypeCode: 0,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 3,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 2,
		migrationServiceLegacyId: 12,
		isActive: true,
	},
	{
		legacyId: 101,
		name: 'DEVOLUCION SIN COBRO',
		shortCode: 'DSC',
		secondaryShortCode: 'DSC',
		salesOrganization: null,
		isLockerService: false,
		requiresManifest: false,
		availableAtCounter: true,
		isNational: true,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: true,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: false,
		usesNationalOverweight: true,
		usesInternationalOverweight: false,
		usesPostalTax: true,
		familyCode: 18,
		serviceTypeCode: 1,
		paymentTypeCode: null,
		pricingFamilyTypeCode: 3,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 0,
		isActive: true,
	},
	{
		legacyId: 100,
		name: 'DEVOLUCION CON PAGO',
		shortCode: 'DCP',
		secondaryShortCode: 'DCP',
		salesOrganization: null,
		isLockerService: false,
		requiresManifest: true,
		availableAtCounter: true,
		isNational: true,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: true,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: false,
		usesNationalOverweight: true,
		usesInternationalOverweight: false,
		usesPostalTax: true,
		familyCode: 18,
		serviceTypeCode: 1,
		paymentTypeCode: null,
		pricingFamilyTypeCode: 3,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 0,
		isActive: true,
	},
	{
		legacyId: 50,
		name: 'CASILLERO INTERNACIONAL CORPORATIVO',
		shortCode: 'BCI',
		secondaryShortCode: 'BCN',
		salesOrganization: 'OV07',
		isLockerService: true,
		requiresManifest: false,
		availableAtCounter: false,
		isNational: false,
		inboundInternational: null,
		outboundInternational: null,
		supportsEffectiveness: true,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 17,
		serviceTypeCode: null,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 1,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'CASILLERO',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 17,
		isActive: true,
	},
	{
		legacyId: 21,
		name: 'PUNTO A PUNTO',
		shortCode: 'BPP',
		secondaryShortCode: 'BCN',
		salesOrganization: 'OV07',
		isLockerService: true,
		requiresManifest: false,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: true,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 18,
		serviceTypeCode: null,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 1,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'CASILLERO',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 10,
		isActive: true,
	},
	{
		legacyId: 18,
		name: 'CASILLERO NACIONAL CORPORATIVO',
		shortCode: 'BCN',
		secondaryShortCode: 'BCN',
		salesOrganization: 'OV07',
		isLockerService: true,
		requiresManifest: true,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: true,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 0,
		serviceTypeCode: null,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 1,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'CASILLERO',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 8,
		isActive: true,
	},
	{
		legacyId: 41,
		name: 'MEDIO PUNTO',
		shortCode: 'BMP',
		secondaryShortCode: 'BCN',
		salesOrganization: 'OV07',
		isLockerService: true,
		requiresManifest: false,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: true,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 18,
		serviceTypeCode: null,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 1,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'CASILLERO',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 9,
		isActive: true,
	},
	{
		legacyId: 72,
		name: 'ENVIO NAC POR PORCENTAJE',
		shortCode: 'GP3',
		secondaryShortCode: 'BGN',
		salesOrganization: '',
		isLockerService: false,
		requiresManifest: false,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: null,
		outboundInternational: null,
		supportsEffectiveness: false,
		initializeOnCreation: null,
		usesCorrelativePq: false,
		usesTemplateGuide: true,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 55,
		serviceTypeCode: null,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 3,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 2,
		isActive: true,
	},
	{
		legacyId: 2,
		name: 'GUIA NACIONAL CONTADO',
		shortCode: 'BGN',
		secondaryShortCode: 'BGN',
		salesOrganization: 'OV07',
		isLockerService: false,
		requiresManifest: true,
		availableAtCounter: true,
		isNational: true,
		inboundInternational: null,
		outboundInternational: null,
		supportsEffectiveness: false,
		initializeOnCreation: null,
		usesCorrelativePq: true,
		usesTemplateGuide: true,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: true,
		familyCode: 57,
		serviceTypeCode: 1,
		paymentTypeCode: 1,
		pricingFamilyTypeCode: 3,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 1,
		isActive: true,
	},
	{
		legacyId: 104,
		name: 'ENVIO NAC 0.250 KG',
		shortCode: 'GP6',
		secondaryShortCode: 'BGN',
		salesOrganization: '',
		isLockerService: false,
		requiresManifest: true,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: null,
		outboundInternational: null,
		supportsEffectiveness: false,
		initializeOnCreation: null,
		usesCorrelativePq: false,
		usesTemplateGuide: true,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: true,
		familyCode: 55,
		serviceTypeCode: 1,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 3,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 2,
		isActive: true,
	},
	{
		legacyId: 1,
		name: 'COD NACIONAL',
		shortCode: 'BCD',
		secondaryShortCode: 'COD',
		salesOrganization: 'OV07',
		isLockerService: false,
		requiresManifest: true,
		availableAtCounter: true,
		isNational: true,
		inboundInternational: null,
		outboundInternational: null,
		supportsEffectiveness: false,
		initializeOnCreation: null,
		usesCorrelativePq: true,
		usesTemplateGuide: true,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: true,
		familyCode: 53,
		serviceTypeCode: 2,
		paymentTypeCode: null,
		pricingFamilyTypeCode: 3,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 5,
		isActive: true,
	},
	{
		legacyId: 11,
		name: 'DISTRIBUCION MASIVA NACIONAL',
		shortCode: 'MAS',
		secondaryShortCode: 'ZGI',
		salesOrganization: '',
		isLockerService: false,
		requiresManifest: true,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: false,
		initializeOnCreation: false,
		usesCorrelativePq: true,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: false,
		usesNationalOverweight: true,
		usesInternationalOverweight: false,
		usesPostalTax: false,
		familyCode: 0,
		serviceTypeCode: null,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 3,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 2,
		migrationServiceLegacyId: 12,
		isActive: true,
	},
	{
		legacyId: 90,
		name: 'CASILLERO AEREO INTERNACIONAL',
		shortCode: 'BCI',
		secondaryShortCode: 'BCN',
		salesOrganization: 'OV07',
		isLockerService: true,
		requiresManifest: false,
		availableAtCounter: false,
		isNational: false,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: true,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: false,
		usesNationalOverweight: true,
		usesInternationalOverweight: false,
		usesPostalTax: false,
		familyCode: 17,
		serviceTypeCode: 1,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 1,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'CASILLERO',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 16,
		isActive: true,
	},
	{
		legacyId: 3,
		name: 'ENVIOS INTERNACIONALES ',
		shortCode: 'ZGI',
		secondaryShortCode: 'ZGI',
		salesOrganization: 'OV07',
		isLockerService: false,
		requiresManifest: true,
		availableAtCounter: true,
		isNational: false,
		inboundInternational: true,
		outboundInternational: true,
		supportsEffectiveness: true,
		initializeOnCreation: false,
		usesCorrelativePq: true,
		usesTemplateGuide: true,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: true,
		usesNationalOverweight: true,
		usesInternationalOverweight: true,
		usesPostalTax: true,
		familyCode: 82,
		serviceTypeCode: 3,
		paymentTypeCode: null,
		pricingFamilyTypeCode: 4,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'INTERNACIONAL',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 3,
		isActive: true,
	},
	{
		legacyId: 71,
		name: 'ENVIO NAC CARGA',
		shortCode: 'GP3',
		secondaryShortCode: 'BGN',
		salesOrganization: 'OV07',
		isLockerService: false,
		requiresManifest: true,
		availableAtCounter: false,
		isNational: true,
		inboundInternational: false,
		outboundInternational: false,
		supportsEffectiveness: false,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: true,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 55,
		serviceTypeCode: 0,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 3,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'NACIONAL',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 2,
		isActive: true,
	},
	{
		legacyId: 102,
		name: 'CASILLERO MARITIMO INTERNACIONAL',
		shortCode: 'CMI',
		secondaryShortCode: 'CMI',
		salesOrganization: 'OV07',
		isLockerService: true,
		requiresManifest: true,
		availableAtCounter: true,
		isNational: false,
		inboundInternational: true,
		outboundInternational: true,
		supportsEffectiveness: true,
		initializeOnCreation: false,
		usesCorrelativePq: false,
		usesTemplateGuide: false,
		usesNationalBaseRate: true,
		usesInternationalBaseRate: null,
		usesNationalOverweight: true,
		usesInternationalOverweight: null,
		usesPostalTax: null,
		familyCode: 17,
		serviceTypeCode: 1,
		paymentTypeCode: 2,
		pricingFamilyTypeCode: 4,
		serviceUsageTypeCode: 1,
		deliveryShortCode: 'CASILLERO',
		guideCloseTypeCode: 3,
		migrationServiceLegacyId: 15,
		isActive: true,
	},
];

// F3.5 — transit_matrix rows from origendestino.csv where BOTH origin AND
// destination are seeded (i.e. both in {19, 40, 29, 16, 25, 33}).
// 36 rows total.
const TRANSIT_MATRIX_ROWS: ReadonlyArray<{
	originLegacyId: number;
	destinationLegacyId: number;
	weightTypeCode: number;
	merchandiseDays: number | null;
	documentDays: number | null;
}> = [
	{
		originLegacyId: 25,
		destinationLegacyId: 25,
		weightTypeCode: 1,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 25,
		destinationLegacyId: 33,
		weightTypeCode: 2,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 25,
		destinationLegacyId: 19,
		weightTypeCode: 2,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 25,
		destinationLegacyId: 29,
		weightTypeCode: 3,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 25,
		destinationLegacyId: 16,
		weightTypeCode: 3,
		merchandiseDays: 2,
		documentDays: 0,
	},
	{
		originLegacyId: 25,
		destinationLegacyId: 40,
		weightTypeCode: 3,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 33,
		destinationLegacyId: 33,
		weightTypeCode: 1,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 33,
		destinationLegacyId: 25,
		weightTypeCode: 2,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 33,
		destinationLegacyId: 29,
		weightTypeCode: 3,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 33,
		destinationLegacyId: 19,
		weightTypeCode: 3,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 33,
		destinationLegacyId: 16,
		weightTypeCode: 3,
		merchandiseDays: 2,
		documentDays: 0,
	},
	{
		originLegacyId: 33,
		destinationLegacyId: 40,
		weightTypeCode: 3,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 29,
		destinationLegacyId: 29,
		weightTypeCode: 1,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 29,
		destinationLegacyId: 25,
		weightTypeCode: 3,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 29,
		destinationLegacyId: 33,
		weightTypeCode: 3,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 29,
		destinationLegacyId: 16,
		weightTypeCode: 3,
		merchandiseDays: 2,
		documentDays: 0,
	},
	{
		originLegacyId: 29,
		destinationLegacyId: 19,
		weightTypeCode: 4,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 29,
		destinationLegacyId: 40,
		weightTypeCode: 4,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 19,
		destinationLegacyId: 19,
		weightTypeCode: 1,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 19,
		destinationLegacyId: 25,
		weightTypeCode: 2,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 19,
		destinationLegacyId: 40,
		weightTypeCode: 2,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 19,
		destinationLegacyId: 33,
		weightTypeCode: 3,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 19,
		destinationLegacyId: 29,
		weightTypeCode: 4,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 19,
		destinationLegacyId: 16,
		weightTypeCode: 4,
		merchandiseDays: 2,
		documentDays: 0,
	},
	{
		originLegacyId: 16,
		destinationLegacyId: 16,
		weightTypeCode: 1,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 16,
		destinationLegacyId: 25,
		weightTypeCode: 3,
		merchandiseDays: 2,
		documentDays: 0,
	},
	{
		originLegacyId: 16,
		destinationLegacyId: 33,
		weightTypeCode: 3,
		merchandiseDays: 2,
		documentDays: 0,
	},
	{
		originLegacyId: 16,
		destinationLegacyId: 29,
		weightTypeCode: 3,
		merchandiseDays: 2,
		documentDays: 0,
	},
	{
		originLegacyId: 16,
		destinationLegacyId: 19,
		weightTypeCode: 4,
		merchandiseDays: 2,
		documentDays: 0,
	},
	{
		originLegacyId: 16,
		destinationLegacyId: 40,
		weightTypeCode: 4,
		merchandiseDays: 2,
		documentDays: 0,
	},
	{
		originLegacyId: 40,
		destinationLegacyId: 40,
		weightTypeCode: 1,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 40,
		destinationLegacyId: 19,
		weightTypeCode: 2,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 40,
		destinationLegacyId: 25,
		weightTypeCode: 3,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 40,
		destinationLegacyId: 33,
		weightTypeCode: 3,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 40,
		destinationLegacyId: 29,
		weightTypeCode: 4,
		merchandiseDays: 0,
		documentDays: 0,
	},
	{
		originLegacyId: 40,
		destinationLegacyId: 16,
		weightTypeCode: 4,
		merchandiseDays: 2,
		documentDays: 0,
	},
];

// F3.5 — postal_tax_rule rows from tasapos.csv for casillero-relevant
// codservicio in {17, 18, 21, 41, 50, 75, 76, 90, 93, 94, 102}. 8 rows match.
// (17, 93, 94 have no rows in the sample CSV.)
const POSTAL_TAX_ROWS: ReadonlyArray<{
	legacyId: number;
	codservicio: number;
	minWeightKg: string;
	maxWeightKg: string;
	taxAmount: string;
	weightTypeCode: number;
	zoneCode: number | null;
	percentage: string | null;
	percentageWeight: string | null;
	effectiveAt: string;
}> = [
	{
		legacyId: 2873,
		codservicio: 18,
		minWeightKg: '0',
		maxWeightKg: '30000',
		taxAmount: '0',
		weightTypeCode: 0,
		zoneCode: 0,
		percentage: '8',
		percentageWeight: '0',
		effectiveAt: '2020-07-20',
	},
	{
		legacyId: 2874,
		codservicio: 21,
		minWeightKg: '0',
		maxWeightKg: '30000',
		taxAmount: '0',
		weightTypeCode: 0,
		zoneCode: 0,
		percentage: '8',
		percentageWeight: '0',
		effectiveAt: '2020-07-20',
	},
	{
		legacyId: 2875,
		codservicio: 41,
		minWeightKg: '0',
		maxWeightKg: '30000',
		taxAmount: '0',
		weightTypeCode: 0,
		zoneCode: 0,
		percentage: '8',
		percentageWeight: '0',
		effectiveAt: '2020-07-20',
	},
	{
		legacyId: 2880,
		codservicio: 75,
		minWeightKg: '0',
		maxWeightKg: '30000',
		taxAmount: '0',
		weightTypeCode: 0,
		zoneCode: 0,
		percentage: '8',
		percentageWeight: '0',
		effectiveAt: '2020-07-20',
	},
	{
		legacyId: 2881,
		codservicio: 76,
		minWeightKg: '0',
		maxWeightKg: '30000',
		taxAmount: '0',
		weightTypeCode: 0,
		zoneCode: 0,
		percentage: '8',
		percentageWeight: '0',
		effectiveAt: '2020-07-20',
	},
	{
		legacyId: 2893,
		codservicio: 50,
		minWeightKg: '0',
		maxWeightKg: '30000',
		taxAmount: '0',
		weightTypeCode: 0,
		zoneCode: 0,
		percentage: '8',
		percentageWeight: '0',
		effectiveAt: '2024-01-01',
	},
	{
		legacyId: 2894,
		codservicio: 90,
		minWeightKg: '0',
		maxWeightKg: '30000',
		taxAmount: '0',
		weightTypeCode: 0,
		zoneCode: 0,
		percentage: '8',
		percentageWeight: '0',
		effectiveAt: '2024-01-01',
	},
	{
		legacyId: 2895,
		codservicio: 102,
		minWeightKg: '0',
		maxWeightKg: '30000',
		taxAmount: '0',
		weightTypeCode: 0,
		zoneCode: 0,
		percentage: '8',
		percentageWeight: '0',
		effectiveAt: '2024-01-01',
	},
];

// F3.5 — national_overweight_rule rows from sobrepesonac.csv for
// codservicio in {21, 41}. 24 rows total (3 effective dates × 4 weight types × 2 services).
const NATIONAL_OVERWEIGHT_ROWS: ReadonlyArray<{
	legacyId: number;
	codservicio: number;
	overweightAmount: string;
	weightTypeCode: number;
	minWeightKg: string;
	maxWeightKg: string;
	overweightTypeCode: number;
	currencyTypeCode: number | null;
	effectiveAt: string;
}> = [
	{
		legacyId: 65887,
		codservicio: 21,
		overweightAmount: '2254.12',
		weightTypeCode: 1,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-15',
	},
	{
		legacyId: 65888,
		codservicio: 21,
		overweightAmount: '3330.92',
		weightTypeCode: 2,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-15',
	},
	{
		legacyId: 65889,
		codservicio: 21,
		overweightAmount: '3508',
		weightTypeCode: 3,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-15',
	},
	{
		legacyId: 65890,
		codservicio: 21,
		overweightAmount: '3536.71',
		weightTypeCode: 4,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-15',
	},
	{
		legacyId: 65891,
		codservicio: 41,
		overweightAmount: '2254.12',
		weightTypeCode: 1,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-15',
	},
	{
		legacyId: 65892,
		codservicio: 41,
		overweightAmount: '3330.92',
		weightTypeCode: 2,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-15',
	},
	{
		legacyId: 65893,
		codservicio: 41,
		overweightAmount: '3508',
		weightTypeCode: 3,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-15',
	},
	{
		legacyId: 65894,
		codservicio: 41,
		overweightAmount: '3536.71',
		weightTypeCode: 4,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-15',
	},
	{
		legacyId: 66057,
		codservicio: 21,
		overweightAmount: '2259.75',
		weightTypeCode: 1,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-16',
	},
	{
		legacyId: 66058,
		codservicio: 21,
		overweightAmount: '3339.25',
		weightTypeCode: 2,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-16',
	},
	{
		legacyId: 66059,
		codservicio: 21,
		overweightAmount: '3516.77',
		weightTypeCode: 3,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-16',
	},
	{
		legacyId: 66060,
		codservicio: 21,
		overweightAmount: '3545.56',
		weightTypeCode: 4,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-16',
	},
	{
		legacyId: 66061,
		codservicio: 41,
		overweightAmount: '2259.75',
		weightTypeCode: 1,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-16',
	},
	{
		legacyId: 66062,
		codservicio: 41,
		overweightAmount: '3339.25',
		weightTypeCode: 2,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-16',
	},
	{
		legacyId: 66063,
		codservicio: 41,
		overweightAmount: '3516.77',
		weightTypeCode: 3,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-16',
	},
	{
		legacyId: 66064,
		codservicio: 41,
		overweightAmount: '3545.56',
		weightTypeCode: 4,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-16',
	},
	{
		legacyId: 66227,
		codservicio: 21,
		overweightAmount: '2262.01',
		weightTypeCode: 1,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66228,
		codservicio: 21,
		overweightAmount: '3342.59',
		weightTypeCode: 2,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66229,
		codservicio: 21,
		overweightAmount: '3520.29',
		weightTypeCode: 3,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66230,
		codservicio: 21,
		overweightAmount: '3549.1',
		weightTypeCode: 4,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66231,
		codservicio: 41,
		overweightAmount: '2262.01',
		weightTypeCode: 1,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66232,
		codservicio: 41,
		overweightAmount: '3342.59',
		weightTypeCode: 2,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66233,
		codservicio: 41,
		overweightAmount: '3520.29',
		weightTypeCode: 3,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66234,
		codservicio: 41,
		overweightAmount: '3549.1',
		weightTypeCode: 4,
		minWeightKg: '0',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		currencyTypeCode: 124,
		effectiveAt: '2026-04-17',
	},
];

// F3.5 — 3 most-recent-date insurance_rule rows from seguro.csv (fechaini=2026-04-17).
// Covers brackets 4803-823641 / 823642-1647282 / 1647283-2401286.
const INSURANCE_ROWS = [
	{
		legacyId: 1250,
		minDeclaredValueAmount: '4803',
		maxDeclaredValueAmount: '823641',
		fixedInsuranceAmount: '0',
		percentageInsurance: '0.035',
		isKeyRule: false,
	},
	{
		legacyId: 1251,
		minDeclaredValueAmount: '823642',
		maxDeclaredValueAmount: '1647282',
		fixedInsuranceAmount: '0',
		percentageInsurance: '0.03',
		isKeyRule: false,
	},
	{
		legacyId: 1252,
		minDeclaredValueAmount: '1647283',
		maxDeclaredValueAmount: '2401286',
		fixedInsuranceAmount: '0',
		percentageInsurance: '0.025',
		isKeyRule: false,
	},
] as const;

// E-006 S-001 — 32 most-recent-date national_base_rate rows from basiconac.csv
// (fechaini=2026-04-20). Covers codservicio ∈ {1, 2} × codtipopes ∈ {1, 2, 3, 4}
// × codtipobas ∈ {0 (door-to-door), 4 (COD office pickup), 5 (Nacional contado
// office pickup)} × 2 weight brackets (0–0.250 kg, 0.251–0.500 kg). The 0.500 kg
// row is the ceiling row used by funbasiconac_age when overweight > 0.
// Stored in kg per spec query: ceiling_g = max_weight_kg * 1000.
const NATIONAL_BASE_RATE_NACIONAL_ROWS: ReadonlyArray<{
	legacyId: number;
	codservicio: number;
	codtipopes: number;
	codtipobas: number;
	minWeightKg: string;
	maxWeightKg: string;
	baseAmount: string;
	effectiveAt: string;
}> = [
	// codservicio=1 (COD), codtipobas=0 (door-to-door)
	{
		legacyId: 21166,
		codservicio: 1,
		codtipopes: 1,
		codtipobas: 0,
		minWeightKg: '0',
		maxWeightKg: '0.250',
		baseAmount: '1607.27',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21167,
		codservicio: 1,
		codtipopes: 1,
		codtipobas: 0,
		minWeightKg: '0.251',
		maxWeightKg: '0.500',
		baseAmount: '1987.43',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21168,
		codservicio: 1,
		codtipopes: 2,
		codtipobas: 0,
		minWeightKg: '0',
		maxWeightKg: '0.250',
		baseAmount: '2752.57',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21169,
		codservicio: 1,
		codtipopes: 2,
		codtipobas: 0,
		minWeightKg: '0.251',
		maxWeightKg: '0.500',
		baseAmount: '3382.96',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21170,
		codservicio: 1,
		codtipopes: 3,
		codtipobas: 0,
		minWeightKg: '0',
		maxWeightKg: '0.250',
		baseAmount: '2752.57',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21171,
		codservicio: 1,
		codtipopes: 3,
		codtipobas: 0,
		minWeightKg: '0.251',
		maxWeightKg: '0.500',
		baseAmount: '3382.96',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21172,
		codservicio: 1,
		codtipopes: 4,
		codtipobas: 0,
		minWeightKg: '0',
		maxWeightKg: '0.250',
		baseAmount: '2752.57',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21173,
		codservicio: 1,
		codtipopes: 4,
		codtipobas: 0,
		minWeightKg: '0.251',
		maxWeightKg: '0.500',
		baseAmount: '3382.96',
		effectiveAt: '2026-04-20',
	},
	// codservicio=1 (COD), codtipobas=4 (office pickup)
	{
		legacyId: 21174,
		codservicio: 1,
		codtipopes: 1,
		codtipobas: 4,
		minWeightKg: '0',
		maxWeightKg: '0.250',
		baseAmount: '1390.72',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21175,
		codservicio: 1,
		codtipopes: 1,
		codtipobas: 4,
		minWeightKg: '0.251',
		maxWeightKg: '0.500',
		baseAmount: '1727.57',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21176,
		codservicio: 1,
		codtipopes: 2,
		codtipobas: 4,
		minWeightKg: '0',
		maxWeightKg: '0.250',
		baseAmount: '1992.24',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21177,
		codservicio: 1,
		codtipopes: 2,
		codtipobas: 4,
		minWeightKg: '0.251',
		maxWeightKg: '0.500',
		baseAmount: '2439.77',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21178,
		codservicio: 1,
		codtipopes: 3,
		codtipobas: 4,
		minWeightKg: '0',
		maxWeightKg: '0.250',
		baseAmount: '1992.24',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21179,
		codservicio: 1,
		codtipopes: 3,
		codtipobas: 4,
		minWeightKg: '0.251',
		maxWeightKg: '0.500',
		baseAmount: '2439.77',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21180,
		codservicio: 1,
		codtipopes: 4,
		codtipobas: 4,
		minWeightKg: '0',
		maxWeightKg: '0.250',
		baseAmount: '1992.24',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21181,
		codservicio: 1,
		codtipopes: 4,
		codtipobas: 4,
		minWeightKg: '0.251',
		maxWeightKg: '0.500',
		baseAmount: '2439.77',
		effectiveAt: '2026-04-20',
	},
	// codservicio=2 (Nacional contado), codtipobas=0 (door-to-door)
	{
		legacyId: 21182,
		codservicio: 2,
		codtipopes: 1,
		codtipobas: 0,
		minWeightKg: '0',
		maxWeightKg: '0.250',
		baseAmount: '1607.27',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21183,
		codservicio: 2,
		codtipopes: 1,
		codtipobas: 0,
		minWeightKg: '0.251',
		maxWeightKg: '0.500',
		baseAmount: '1987.43',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21184,
		codservicio: 2,
		codtipopes: 2,
		codtipobas: 0,
		minWeightKg: '0',
		maxWeightKg: '0.250',
		baseAmount: '2752.57',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21185,
		codservicio: 2,
		codtipopes: 2,
		codtipobas: 0,
		minWeightKg: '0.251',
		maxWeightKg: '0.500',
		baseAmount: '3382.96',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21186,
		codservicio: 2,
		codtipopes: 3,
		codtipobas: 0,
		minWeightKg: '0',
		maxWeightKg: '0.250',
		baseAmount: '2752.57',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21187,
		codservicio: 2,
		codtipopes: 3,
		codtipobas: 0,
		minWeightKg: '0.251',
		maxWeightKg: '0.500',
		baseAmount: '3382.96',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21188,
		codservicio: 2,
		codtipopes: 4,
		codtipobas: 0,
		minWeightKg: '0',
		maxWeightKg: '0.250',
		baseAmount: '2752.57',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21189,
		codservicio: 2,
		codtipopes: 4,
		codtipobas: 0,
		minWeightKg: '0.251',
		maxWeightKg: '0.500',
		baseAmount: '3382.96',
		effectiveAt: '2026-04-20',
	},
	// codservicio=2 (Nacional contado), codtipobas=5 (office pickup)
	{
		legacyId: 21190,
		codservicio: 2,
		codtipopes: 1,
		codtipobas: 5,
		minWeightKg: '0',
		maxWeightKg: '0.250',
		baseAmount: '1390.72',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21191,
		codservicio: 2,
		codtipopes: 1,
		codtipobas: 5,
		minWeightKg: '0.251',
		maxWeightKg: '0.500',
		baseAmount: '1727.57',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21192,
		codservicio: 2,
		codtipopes: 2,
		codtipobas: 5,
		minWeightKg: '0',
		maxWeightKg: '0.250',
		baseAmount: '1992.24',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21193,
		codservicio: 2,
		codtipopes: 2,
		codtipobas: 5,
		minWeightKg: '0.251',
		maxWeightKg: '0.500',
		baseAmount: '2439.77',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21194,
		codservicio: 2,
		codtipopes: 3,
		codtipobas: 5,
		minWeightKg: '0',
		maxWeightKg: '0.250',
		baseAmount: '1992.24',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21195,
		codservicio: 2,
		codtipopes: 3,
		codtipobas: 5,
		minWeightKg: '0.251',
		maxWeightKg: '0.500',
		baseAmount: '2439.77',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21196,
		codservicio: 2,
		codtipopes: 4,
		codtipobas: 5,
		minWeightKg: '0',
		maxWeightKg: '0.250',
		baseAmount: '1992.24',
		effectiveAt: '2026-04-20',
	},
	{
		legacyId: 21197,
		codservicio: 2,
		codtipopes: 4,
		codtipobas: 5,
		minWeightKg: '0.251',
		maxWeightKg: '0.500',
		baseAmount: '2439.77',
		effectiveAt: '2026-04-20',
	},
];

// E-006 S-001 — commission_rule rows. Real rows from comision.csv are scarce
// (only modalidad=1 / by-weight exists in production). Seed the most-recent
// real row + 2 fictional modalidad=2 (by-value) rows to enable test coverage
// of the by-value branch in calculate-national-commission. The fictional
// rows bridge the comision sample-data gap — replace when production sync runs.
const COMMISSION_RULE_ROWS: ReadonlyArray<{
	legacyId: number;
	modeType: number;
	minAmount: string;
	maxAmount: string;
	fixedCommissionAmount: string;
	percentageCommission: string;
	effectiveAt: string;
	fictional: boolean;
}> = [
	{
		legacyId: 785,
		modeType: 1,
		minAmount: '0',
		maxAmount: '500000',
		fixedCommissionAmount: '345.79',
		percentageCommission: '0',
		effectiveAt: '2026-04-17',
		fictional: false,
	},
	// FICTIONAL: bridges comision sample-data gap for modalidad=2 (by-value)
	// commission. Replace with real catalog rows when production sync runs.
	{
		legacyId: 99901,
		modeType: 2,
		minAmount: '0',
		maxAmount: '500000',
		fixedCommissionAmount: '0',
		percentageCommission: '5',
		effectiveAt: '2026-04-16',
		fictional: true,
	},
	{
		legacyId: 99902,
		modeType: 2,
		minAmount: '500001',
		maxAmount: '5000000',
		fixedCommissionAmount: '0',
		percentageCommission: '3',
		effectiveAt: '2026-04-16',
		fictional: true,
	},
];

// E-006 S-001 — 10 route_master rows, one per seeded office. Per spec §1.4.3.
// `maxWeightKg` varies to support weight-ceiling test scenarios (low-ceiling
// rejection at TRB / VLP; high ceilings at CAB; etc.).
const ROUTE_MASTER_ROWS: ReadonlyArray<{
	legacyId: number;
	officeLegacyId: number;
	name: string;
	maxWeightKg: string;
}> = [
	{
		legacyId: 90101,
		officeLegacyId: 46,
		name: 'ZOOM LA URBINA (CCS)',
		maxWeightKg: '50.000',
	},
	{
		legacyId: 90102,
		officeLegacyId: 889,
		name: 'ZOOM VALLE DE LA PASCUA',
		maxWeightKg: '30.000',
	},
	{
		legacyId: 90103,
		officeLegacyId: 4113,
		name: 'ZOOM CABIMAS',
		maxWeightKg: '200.000',
	},
	{
		legacyId: 90104,
		officeLegacyId: 112,
		name: 'ZOOM SAN ANTONIO',
		maxWeightKg: '100.000',
	},
	{
		legacyId: 90105,
		officeLegacyId: 2,
		name: 'ZOOM ACARIGUA',
		maxWeightKg: '50.000',
	},
	{
		legacyId: 90106,
		officeLegacyId: 6,
		name: 'ZOOM BARINAS',
		maxWeightKg: '50.000',
	},
	{
		legacyId: 90107,
		officeLegacyId: 90001,
		name: 'Oficina Prueba TRB',
		maxWeightKg: '25.000',
	},
	{
		legacyId: 90108,
		officeLegacyId: 90002,
		name: 'Oficina Prueba TRA',
		maxWeightKg: '100.000',
	},
	{
		legacyId: 90109,
		officeLegacyId: 90003,
		name: 'Oficina Prueba IEX',
		maxWeightKg: '50.000',
	},
	{
		legacyId: 90110,
		officeLegacyId: 90004,
		name: 'Oficina Prueba sin Siglas',
		maxWeightKg: '50.000',
	},
];

// E-006 S-001 — 48 most-recent-date national_overweight_rule rows from
// sobrepesonac.csv (fechaini=2026-04-17) extending S-002 coverage to
// codservicio ∈ {1, 2} (COD + Nacional contado). Covers codtipopes ∈ {1, 2}
// × codtiposob ∈ {0 (door-to-door), real} × 6 kilossob brackets.
// `min_weight_kg`/`max_weight_kg` here are kilossob counts (half-kilos),
// matching the legacy `pesomin`/`pesomax` semantics in sobrepesonac.
const NATIONAL_OVERWEIGHT_NACIONAL_ROWS: ReadonlyArray<{
	legacyId: number;
	codservicio: number;
	overweightAmount: string;
	weightTypeCode: number;
	minWeightKg: string;
	maxWeightKg: string;
	overweightTypeCode: number;
	effectiveAt: string;
}> = [
	// codservicio=1 (COD), codtiposob=1 (office pickup), codtipopes=1
	{
		legacyId: 66090,
		codservicio: 1,
		overweightAmount: '417.82',
		weightTypeCode: 1,
		minWeightKg: '1',
		maxWeightKg: '3',
		overweightTypeCode: 1,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66091,
		codservicio: 1,
		overweightAmount: '456.24',
		weightTypeCode: 1,
		minWeightKg: '4',
		maxWeightKg: '7',
		overweightTypeCode: 1,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66092,
		codservicio: 1,
		overweightAmount: '432.23',
		weightTypeCode: 1,
		minWeightKg: '8',
		maxWeightKg: '11',
		overweightTypeCode: 1,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66093,
		codservicio: 1,
		overweightAmount: '403.42',
		weightTypeCode: 1,
		minWeightKg: '12',
		maxWeightKg: '15',
		overweightTypeCode: 1,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66094,
		codservicio: 1,
		overweightAmount: '379.40',
		weightTypeCode: 1,
		minWeightKg: '16',
		maxWeightKg: '19',
		overweightTypeCode: 1,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66095,
		codservicio: 1,
		overweightAmount: '374.60',
		weightTypeCode: 1,
		minWeightKg: '20',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 1,
		effectiveAt: '2026-04-17',
	},
	// codservicio=1, codtiposob=1, codtipopes=2
	{
		legacyId: 66096,
		codservicio: 1,
		overweightAmount: '432.23',
		weightTypeCode: 2,
		minWeightKg: '1',
		maxWeightKg: '3',
		overweightTypeCode: 1,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66097,
		codservicio: 1,
		overweightAmount: '542.69',
		weightTypeCode: 2,
		minWeightKg: '4',
		maxWeightKg: '7',
		overweightTypeCode: 1,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66098,
		codservicio: 1,
		overweightAmount: '537.89',
		weightTypeCode: 2,
		minWeightKg: '8',
		maxWeightKg: '11',
		overweightTypeCode: 1,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66099,
		codservicio: 1,
		overweightAmount: '533.09',
		weightTypeCode: 2,
		minWeightKg: '12',
		maxWeightKg: '15',
		overweightTypeCode: 1,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66100,
		codservicio: 1,
		overweightAmount: '523.48',
		weightTypeCode: 2,
		minWeightKg: '16',
		maxWeightKg: '19',
		overweightTypeCode: 1,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66101,
		codservicio: 1,
		overweightAmount: '509.07',
		weightTypeCode: 2,
		minWeightKg: '20',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 1,
		effectiveAt: '2026-04-17',
	},
	// codservicio=1, codtiposob=0 (door-to-door), codtipopes=1
	{
		legacyId: 66114,
		codservicio: 1,
		overweightAmount: '437.03',
		weightTypeCode: 1,
		minWeightKg: '1',
		maxWeightKg: '3',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66115,
		codservicio: 1,
		overweightAmount: '509.07',
		weightTypeCode: 1,
		minWeightKg: '4',
		maxWeightKg: '7',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66116,
		codservicio: 1,
		overweightAmount: '475.45',
		weightTypeCode: 1,
		minWeightKg: '8',
		maxWeightKg: '11',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66117,
		codservicio: 1,
		overweightAmount: '437.03',
		weightTypeCode: 1,
		minWeightKg: '12',
		maxWeightKg: '15',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66118,
		codservicio: 1,
		overweightAmount: '413.02',
		weightTypeCode: 1,
		minWeightKg: '16',
		maxWeightKg: '19',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66119,
		codservicio: 1,
		overweightAmount: '398.61',
		weightTypeCode: 1,
		minWeightKg: '20',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	// codservicio=1, codtiposob=0, codtipopes=2
	{
		legacyId: 66120,
		codservicio: 1,
		overweightAmount: '461.05',
		weightTypeCode: 2,
		minWeightKg: '1',
		maxWeightKg: '3',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66121,
		codservicio: 1,
		overweightAmount: '638.74',
		weightTypeCode: 2,
		minWeightKg: '4',
		maxWeightKg: '7',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66122,
		codservicio: 1,
		overweightAmount: '633.94',
		weightTypeCode: 2,
		minWeightKg: '8',
		maxWeightKg: '11',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66123,
		codservicio: 1,
		overweightAmount: '600.32',
		weightTypeCode: 2,
		minWeightKg: '12',
		maxWeightKg: '15',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66124,
		codservicio: 1,
		overweightAmount: '585.91',
		weightTypeCode: 2,
		minWeightKg: '16',
		maxWeightKg: '19',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66125,
		codservicio: 1,
		overweightAmount: '581.11',
		weightTypeCode: 2,
		minWeightKg: '20',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	// codservicio=2 (Nacional contado), codtiposob=2 (office pickup), codtipopes=1
	{
		legacyId: 66138,
		codservicio: 2,
		overweightAmount: '417.82',
		weightTypeCode: 1,
		minWeightKg: '1',
		maxWeightKg: '3',
		overweightTypeCode: 2,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66139,
		codservicio: 2,
		overweightAmount: '456.24',
		weightTypeCode: 1,
		minWeightKg: '4',
		maxWeightKg: '7',
		overweightTypeCode: 2,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66140,
		codservicio: 2,
		overweightAmount: '432.23',
		weightTypeCode: 1,
		minWeightKg: '8',
		maxWeightKg: '11',
		overweightTypeCode: 2,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66141,
		codservicio: 2,
		overweightAmount: '403.42',
		weightTypeCode: 1,
		minWeightKg: '12',
		maxWeightKg: '15',
		overweightTypeCode: 2,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66142,
		codservicio: 2,
		overweightAmount: '379.40',
		weightTypeCode: 1,
		minWeightKg: '16',
		maxWeightKg: '19',
		overweightTypeCode: 2,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66143,
		codservicio: 2,
		overweightAmount: '374.60',
		weightTypeCode: 1,
		minWeightKg: '20',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 2,
		effectiveAt: '2026-04-17',
	},
	// codservicio=2, codtiposob=2, codtipopes=2
	{
		legacyId: 66144,
		codservicio: 2,
		overweightAmount: '432.23',
		weightTypeCode: 2,
		minWeightKg: '1',
		maxWeightKg: '3',
		overweightTypeCode: 2,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66145,
		codservicio: 2,
		overweightAmount: '542.69',
		weightTypeCode: 2,
		minWeightKg: '4',
		maxWeightKg: '7',
		overweightTypeCode: 2,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66146,
		codservicio: 2,
		overweightAmount: '537.89',
		weightTypeCode: 2,
		minWeightKg: '8',
		maxWeightKg: '11',
		overweightTypeCode: 2,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66147,
		codservicio: 2,
		overweightAmount: '533.09',
		weightTypeCode: 2,
		minWeightKg: '12',
		maxWeightKg: '15',
		overweightTypeCode: 2,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66148,
		codservicio: 2,
		overweightAmount: '523.48',
		weightTypeCode: 2,
		minWeightKg: '16',
		maxWeightKg: '19',
		overweightTypeCode: 2,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66149,
		codservicio: 2,
		overweightAmount: '509.07',
		weightTypeCode: 2,
		minWeightKg: '20',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 2,
		effectiveAt: '2026-04-17',
	},
	// codservicio=2, codtiposob=0 (door-to-door), codtipopes=1
	{
		legacyId: 66162,
		codservicio: 2,
		overweightAmount: '437.03',
		weightTypeCode: 1,
		minWeightKg: '1',
		maxWeightKg: '3',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66163,
		codservicio: 2,
		overweightAmount: '509.07',
		weightTypeCode: 1,
		minWeightKg: '4',
		maxWeightKg: '7',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66164,
		codservicio: 2,
		overweightAmount: '475.45',
		weightTypeCode: 1,
		minWeightKg: '8',
		maxWeightKg: '11',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66165,
		codservicio: 2,
		overweightAmount: '437.03',
		weightTypeCode: 1,
		minWeightKg: '12',
		maxWeightKg: '15',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66166,
		codservicio: 2,
		overweightAmount: '413.02',
		weightTypeCode: 1,
		minWeightKg: '16',
		maxWeightKg: '19',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66167,
		codservicio: 2,
		overweightAmount: '398.61',
		weightTypeCode: 1,
		minWeightKg: '20',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	// codservicio=2, codtiposob=0, codtipopes=2
	{
		legacyId: 66168,
		codservicio: 2,
		overweightAmount: '461.05',
		weightTypeCode: 2,
		minWeightKg: '1',
		maxWeightKg: '3',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66169,
		codservicio: 2,
		overweightAmount: '638.74',
		weightTypeCode: 2,
		minWeightKg: '4',
		maxWeightKg: '7',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66170,
		codservicio: 2,
		overweightAmount: '633.94',
		weightTypeCode: 2,
		minWeightKg: '8',
		maxWeightKg: '11',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66171,
		codservicio: 2,
		overweightAmount: '600.32',
		weightTypeCode: 2,
		minWeightKg: '12',
		maxWeightKg: '15',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66172,
		codservicio: 2,
		overweightAmount: '585.91',
		weightTypeCode: 2,
		minWeightKg: '16',
		maxWeightKg: '19',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
	{
		legacyId: 66173,
		codservicio: 2,
		overweightAmount: '581.11',
		weightTypeCode: 2,
		minWeightKg: '20',
		maxWeightKg: '9999999.999',
		overweightTypeCode: 0,
		effectiveAt: '2026-04-17',
	},
];

// E-006 S-001 — 4 postal_tax_rule rows from tasapos.csv extending S-002
// coverage to codservicio ∈ {1, 2}, covering codtipopes ∈ {1, 2}. All rows
// use the most-recent date (2020-07-20) — postal tax has not been adjusted
// recently. `min_weight_kg`/`max_weight_kg` here are stored in grams to
// match the existing S-002 convention (DrizzlePricingRuleRepository compares
// against weightGrams directly).
const POSTAL_TAX_NACIONAL_ROWS: ReadonlyArray<{
	legacyId: number;
	codservicio: number;
	minWeightKg: string;
	maxWeightKg: string;
	taxAmount: string;
	weightTypeCode: number;
	zoneCode: number | null;
	percentage: string | null;
	percentageWeight: string | null;
	effectiveAt: string;
}> = [
	{
		legacyId: 2851,
		codservicio: 1,
		minWeightKg: '0',
		maxWeightKg: '30000',
		taxAmount: '0',
		weightTypeCode: 1,
		zoneCode: 0,
		percentage: '8',
		percentageWeight: '0',
		effectiveAt: '2020-07-20',
	},
	{
		legacyId: 2852,
		codservicio: 1,
		minWeightKg: '0',
		maxWeightKg: '30000',
		taxAmount: '0',
		weightTypeCode: 2,
		zoneCode: 0,
		percentage: '8',
		percentageWeight: '0',
		effectiveAt: '2020-07-20',
	},
	{
		legacyId: 2856,
		codservicio: 2,
		minWeightKg: '0',
		maxWeightKg: '30000',
		taxAmount: '0',
		weightTypeCode: 1,
		zoneCode: 0,
		percentage: '8',
		percentageWeight: '0',
		effectiveAt: '2020-07-20',
	},
	{
		legacyId: 2857,
		codservicio: 2,
		minWeightKg: '0',
		maxWeightKg: '30000',
		taxAmount: '0',
		weightTypeCode: 2,
		zoneCode: 0,
		percentage: '8',
		percentageWeight: '0',
		effectiveAt: '2020-07-20',
	},
];

const PERMISSIONS = [
	{
		key: 'share_guide_recipients' as const,
		name: 'Compartir destinatarios guía',
		description:
			'Permite ver y usar la libreta de destinatarios de guía del negocio.',
	},
	{
		key: 'share_locker_recipients' as const,
		name: 'Compartir destinatarios casillero',
		description:
			'Permite ver y usar la libreta de destinatarios de casillero del negocio.',
	},
	{
		key: 'view_reports' as const,
		name: 'Ver reportes',
		description: 'Permite visualizar los reportes del negocio.',
	},
] as const;

// admin: all services enabled, all permissions allowed
// operator: all services enabled, reports.view denied
const ROLE_TEMPLATES = [
	{
		key: 'admin',
		name: 'Administrador',
		description: 'Acceso completo a todas las funciones de la cuenta',
	},
	{
		key: 'operator',
		name: 'Operador',
		description: 'Puede crear y consultar envíos; sin acceso a facturación',
	},
] as const;

const PHONE_PREFIXES = [
	{
		legacyId: 1,
		carrierName: 'Movistar',
		prefix: '0414',
		prefixType: 'mobile',
		countryPrefix: '+58',
		countryIsoCode: 'VE',
	},
	{
		legacyId: 2,
		carrierName: 'Movistar',
		prefix: '0424',
		prefixType: 'mobile',
		countryPrefix: '+58',
		countryIsoCode: 'VE',
	},
	{
		legacyId: 3,
		carrierName: 'Digitel',
		prefix: '0412',
		prefixType: 'mobile',
		countryPrefix: '+58',
		countryIsoCode: 'VE',
	},
	{
		legacyId: 4,
		carrierName: 'Digitel',
		prefix: '0422',
		prefixType: 'mobile',
		countryPrefix: '+58',
		countryIsoCode: 'VE',
	},
	{
		legacyId: 5,
		carrierName: 'Movilnet',
		prefix: '0416',
		prefixType: 'mobile',
		countryPrefix: '+58',
		countryIsoCode: 'VE',
	},
	{
		legacyId: 6,
		carrierName: 'Movilnet',
		prefix: '0426',
		prefixType: 'mobile',
		countryPrefix: '+58',
		countryIsoCode: 'VE',
	},
] as const;

// Legacy codtelefonica rows (international scope).
// codigouno/codigodos map to dialing prefixes; R.DOMINICANA has two codes.
const INTERNATIONAL_PHONE_PREFIXES = [
	{
		legacyId: 1011,
		carrierName: 'COLOMBIA',
		prefix: '57',
		countryPrefix: '+57',
		countryIsoCode: 'CO',
	},
	{
		legacyId: 1016,
		carrierName: 'R.DOMINICANA',
		prefix: '809',
		countryPrefix: '+809',
		countryIsoCode: 'DO',
	},
	{
		legacyId: 1116,
		carrierName: 'R.DOMINICANA',
		prefix: '829',
		countryPrefix: '+829',
		countryIsoCode: 'DO',
	},
	{
		legacyId: 1004,
		carrierName: 'TELEFONICA ARGENTINA',
		prefix: '549',
		countryPrefix: '+549',
		countryIsoCode: 'AR',
	},
	{
		legacyId: 1020,
		carrierName: 'UNITED STATES',
		prefix: '1',
		countryPrefix: '+1',
		countryIsoCode: 'US',
	},
] as const;

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
	await loadEnv();

	const pool = new Pool({ connectionString: env.DATABASE_URL });

	// Acquire a session-scoped advisory lock; if another instance holds it, skip.
	const lockResult = await pool.query<{ acquired: boolean }>(
		'SELECT pg_try_advisory_lock($1::bigint) AS acquired',
		[SEED_ADVISORY_LOCK_KEY.toString()],
	);
	if (!lockResult.rows[0]?.acquired) {
		console.log('ℹ️  Another instance is seeding — skipping.');
		await pool.end();
		return;
	}

	const db = drizzle(pool);

	console.log('🌱 Starting seed…');

	try {
		// ---------------------------------------------------------------------
		// 1. Country — Venezuela
		// ---------------------------------------------------------------------
		const [existingCountry] = await db
			.select({ id: countryMaster.id })
			.from(countryMaster)
			.where(eq(countryMaster.legacyId, 58))
			.limit(1);

		let countryId: string;

		if (existingCountry) {
			countryId = existingCountry.id;
			console.log('ℹ️  Country already exists (Venezuela) — skipping.');
		} else {
			const [inserted] = await db
				.insert(countryMaster)
				.values({
					legacyId: 58,
					isoCode: 'VEN',
					name: 'Venezuela',
					capital: 'Caracas',
					internationalAreaCode: '+58',
					collectTransportCharge: false,
					isInactive: false,
				})
				.returning({ id: countryMaster.id });
			countryId = inserted.id;
			console.log('✅ Created country: Venezuela');
		}

		// ---------------------------------------------------------------------
		// 2a. State — Distrito Capital (legacyId=2, realigned from legacyId=1)
		// ---------------------------------------------------------------------
		// F3.1 migration shim — if a previous run inserted Distrito Capital with
		// legacyId=1 (the old placeholder), bump it to legacyId=2 in place.
		await db
			.update(stateMaster)
			.set({
				legacyId: 2,
				shortCode: 'VE-A',
				regionCode: 1,
				bcvStateCode: 1,
				ipostelStateCode: 1,
			})
			.where(eq(stateMaster.legacyId, 1));

		const [existingDcState] = await db
			.select({ id: stateMaster.id })
			.from(stateMaster)
			.where(eq(stateMaster.legacyId, 2))
			.limit(1);

		let stateId: string;

		if (existingDcState) {
			stateId = existingDcState.id;
			console.log('ℹ️  State already exists (Distrito Capital) — skipping.');
		} else {
			const [inserted] = await db
				.insert(stateMaster)
				.values({
					legacyId: 2,
					externalCode: 'DC',
					name: 'Distrito Capital',
					shortCode: 'VE-A',
					countryId,
					regionCode: 1,
					bcvStateCode: 1,
					ipostelStateCode: 1,
					latitude: '10.4806000',
					longitude: '-66.9036000',
					isActive: true,
				})
				.returning({ id: stateMaster.id });
			stateId = inserted.id;
			console.log('✅ Created state: Distrito Capital');
		}

		// ---------------------------------------------------------------------
		// 2b. States — 5 new states (F3.2)
		// ---------------------------------------------------------------------
		const stateIdsByLegacyId = new Map<number, string>([[2, stateId]]);
		for (const st of NEW_STATES) {
			const [existing] = await db
				.select({ id: stateMaster.id })
				.from(stateMaster)
				.where(eq(stateMaster.legacyId, st.legacyId))
				.limit(1);

			if (existing) {
				stateIdsByLegacyId.set(st.legacyId, existing.id);
				console.log(`ℹ️  State already exists (${st.name}) — skipping.`);
				continue;
			}

			const [inserted] = await db
				.insert(stateMaster)
				.values({
					legacyId: st.legacyId,
					name: st.name,
					shortCode: st.shortCode,
					countryId,
					regionCode: st.regionCode,
					bcvStateCode: st.bcvStateCode,
					ipostelStateCode: st.ipostelStateCode,
					latitude: st.latitude,
					longitude: st.longitude,
					isActive: true,
				})
				.returning({ id: stateMaster.id });
			stateIdsByLegacyId.set(st.legacyId, inserted.id);
			console.log(`✅ Created state: ${st.name}`);
		}

		// ---------------------------------------------------------------------
		// 3. Municipality — Libertador
		// ---------------------------------------------------------------------
		const [existingMunicipality] = await db
			.select({ id: municipalityMaster.id })
			.from(municipalityMaster)
			.where(eq(municipalityMaster.legacyId, 1))
			.limit(1);

		let municipalityId: string;

		if (existingMunicipality) {
			municipalityId = existingMunicipality.id;
			console.log('ℹ️  Municipality already exists (Libertador) — skipping.');
		} else {
			const [inserted] = await db
				.insert(municipalityMaster)
				.values({
					legacyId: 1,
					externalCode: 'LIB',
					stateId,
					name: 'Libertador',
					isActive: true,
				})
				.returning({ id: municipalityMaster.id });
			municipalityId = inserted.id;
			console.log('✅ Created municipality: Libertador');
		}

		// ---------------------------------------------------------------------
		// 4. Transport charge rules (F3.4) — 14 rows
		// ---------------------------------------------------------------------
		const transportChargeIdsByLegacyId = new Map<number, string>();
		const transportEffectiveAt = new Date('2025-11-04T00:00:00Z');
		for (const t of TRANSPORT_CHARGES) {
			const [existing] = await db
				.select({ id: transportChargeRule.id })
				.from(transportChargeRule)
				.where(eq(transportChargeRule.legacyId, t.legacyId))
				.limit(1);

			if (existing) {
				transportChargeIdsByLegacyId.set(t.legacyId, existing.id);
				console.log(
					`ℹ️  Transport charge already exists (legacyId=${t.legacyId}) — skipping.`,
				);
				continue;
			}

			const [inserted] = await db
				.insert(transportChargeRule)
				.values({
					legacyId: t.legacyId,
					amount: t.amount,
					currencyTypeCode: 4,
					effectiveAt: transportEffectiveAt,
					isActive: true,
				})
				.returning({ id: transportChargeRule.id });
			transportChargeIdsByLegacyId.set(t.legacyId, inserted.id);
			console.log(
				`✅ Created transport charge: legacyId=${t.legacyId} Bs ${t.amount}`,
			);
		}

		// ---------------------------------------------------------------------
		// 5. Offices — pass 1 (cityId=null; filled in second pass)
		// ---------------------------------------------------------------------
		// Migration shim for prior runs with legacyId=1 placeholder.
		await db
			.update(officeMaster)
			.set({
				legacyId: 46,
				name: 'ZOOM LA URBINA',
				isOperatingStation: true,
			})
			.where(eq(officeMaster.legacyId, 1));

		const officeIdsByLegacyId = new Map<number, string>();

		const upsertOffice = async (input: {
			legacyId: number;
			name: string;
			shortCode: string | null;
			address?: string | null;
			isOperatingStation?: boolean;
		}): Promise<string> => {
			const [existing] = await db
				.select({ id: officeMaster.id })
				.from(officeMaster)
				.where(eq(officeMaster.legacyId, input.legacyId))
				.limit(1);
			if (existing) {
				officeIdsByLegacyId.set(input.legacyId, existing.id);
				console.log(
					`ℹ️  Office already exists (${input.name}) — skipping insert.`,
				);
				return existing.id;
			}
			const [inserted] = await db
				.insert(officeMaster)
				.values({
					legacyId: input.legacyId,
					name: input.name,
					shortCode: input.shortCode,
					address: input.address ?? null,
					isOperatingStation: input.isOperatingStation ?? true,
					isActive: true,
				})
				.returning({ id: officeMaster.id });
			officeIdsByLegacyId.set(input.legacyId, inserted.id);
			console.log(`✅ Created office: ${input.name}`);
			return inserted.id;
		};

		await upsertOffice({
			legacyId: 46,
			name: 'ZOOM LA URBINA',
			shortCode: 'CCS',
			address: 'Av. Universidad, Caracas 1010',
			isOperatingStation: true,
		});

		for (const c of REAL_CITIES) {
			await upsertOffice({
				legacyId: c.officeLegacyId,
				name: c.officeName,
				shortCode: c.officeSiglas,
				isOperatingStation: true,
			});
		}

		for (const c of FICTIONAL_CITIES) {
			await upsertOffice({
				legacyId: c.officeLegacyId,
				name: c.officeName,
				shortCode: c.officeSiglas,
				isOperatingStation: true,
			});
		}

		// ---------------------------------------------------------------------
		// 6. Cities — Caracas (realigned) + 5 real + 4 fictional
		// ---------------------------------------------------------------------
		// F3.1 — Caracas legacyId 1 → 19, fill missing columns.
		await db
			.update(cityMaster)
			.set({ legacyId: 19 })
			.where(eq(cityMaster.legacyId, 1));

		const cityIdsByLegacyId = new Map<number, string>();
		const transportChargeIdZero = transportChargeIdsByLegacyId.get(0);
		if (!transportChargeIdZero) {
			throw new Error('transport_charge_rule legacyId=0 was not seeded');
		}
		const ccsOfficeId = officeIdsByLegacyId.get(46);
		if (!ccsOfficeId) {
			throw new Error('CCS office (legacyId=46) was not seeded');
		}

		const [existingCaracas] = await db
			.select({ id: cityMaster.id })
			.from(cityMaster)
			.where(eq(cityMaster.legacyId, 19))
			.limit(1);

		let caracasId: string;
		if (existingCaracas) {
			caracasId = existingCaracas.id;
			// Idempotent fill-in for missing columns (covers prior partial seed).
			await db
				.update(cityMaster)
				.set({
					externalCode: 'CCS',
					name: 'Caracas',
					normalizedName: 'caracas',
					countryId,
					stateId,
					municipalityId,
					operatingOfficeId: ccsOfficeId,
					officeId: ccsOfficeId,
					transportChargeRuleId: transportChargeIdZero,
					maxWeightKg: '200.000',
					rateTypeCode: 2,
					stationCode: 19,
					categoryCode: 1,
					nationalVatRate: '16',
					nationalSurchargeRate: '0',
					internationalVatRate: '16',
					internationalSurchargeRate: '0',
					latitude: '10.4806000',
					longitude: '-66.9036000',
					supportsCod: true,
					pickupAvailable: true,
					paperDeliveryDisabled: false,
					frequencyMon: true,
					frequencyTue: true,
					frequencyWed: true,
					frequencyThu: true,
					frequencyFri: true,
					frequencySat: false,
					frequencySun: false,
					isActive: true,
				})
				.where(eq(cityMaster.id, caracasId));
			console.log('ℹ️  City already exists (Caracas) — refreshed columns.');
		} else {
			const [inserted] = await db
				.insert(cityMaster)
				.values({
					legacyId: 19,
					externalCode: 'CCS',
					name: 'Caracas',
					normalizedName: 'caracas',
					countryId,
					stateId,
					municipalityId,
					operatingOfficeId: ccsOfficeId,
					officeId: ccsOfficeId,
					transportChargeRuleId: transportChargeIdZero,
					maxWeightKg: '200.000',
					rateTypeCode: 2,
					stationCode: 19,
					categoryCode: 1,
					nationalVatRate: '16',
					nationalSurchargeRate: '0',
					internationalVatRate: '16',
					internationalSurchargeRate: '0',
					latitude: '10.4806000',
					longitude: '-66.9036000',
					supportsCod: true,
					pickupAvailable: true,
					paperDeliveryDisabled: false,
					frequencyMon: true,
					frequencyTue: true,
					frequencyWed: true,
					frequencyThu: true,
					frequencyFri: true,
					frequencySat: false,
					frequencySun: false,
					isActive: true,
				})
				.returning({ id: cityMaster.id });
			caracasId = inserted.id;
			console.log('✅ Created city: Caracas');
		}
		cityIdsByLegacyId.set(19, caracasId);

		// F3.3 — 5 real cities.
		for (const c of REAL_CITIES) {
			const officeId = officeIdsByLegacyId.get(c.officeLegacyId);
			const cityStateId = stateIdsByLegacyId.get(c.stateLegacyId);
			if (!officeId || !cityStateId) {
				throw new Error(
					`Missing FK for city ${c.name} — office or state not seeded.`,
				);
			}
			const [existing] = await db
				.select({ id: cityMaster.id })
				.from(cityMaster)
				.where(eq(cityMaster.legacyId, c.legacyId))
				.limit(1);

			if (existing) {
				cityIdsByLegacyId.set(c.legacyId, existing.id);
				console.log(`ℹ️  City already exists (${c.name}) — skipping.`);
				continue;
			}

			const [inserted] = await db
				.insert(cityMaster)
				.values({
					legacyId: c.legacyId,
					name: c.name,
					countryId,
					stateId: cityStateId,
					operatingOfficeId: officeId,
					officeId,
					transportChargeRuleId: transportChargeIdZero,
					maxWeightKg: c.maxWeightKg,
					categoryCode: c.categoryCode,
					nationalVatRate: '16',
					nationalSurchargeRate: '0',
					isActive: true,
				})
				.returning({ id: cityMaster.id });
			cityIdsByLegacyId.set(c.legacyId, inserted.id);
			console.log(`✅ Created city: ${c.name}`);
		}

		// F3.6 — 4 fictional cities.
		for (const c of FICTIONAL_CITIES) {
			const officeId = officeIdsByLegacyId.get(c.officeLegacyId);
			const transportChargeId = transportChargeIdsByLegacyId.get(
				c.transportChargeLegacyId,
			);
			if (!officeId || !transportChargeId) {
				throw new Error(
					`Missing FK for fictional city ${c.name} — office or transport_charge not seeded.`,
				);
			}
			const [existing] = await db
				.select({ id: cityMaster.id })
				.from(cityMaster)
				.where(eq(cityMaster.legacyId, c.legacyId))
				.limit(1);

			if (existing) {
				cityIdsByLegacyId.set(c.legacyId, existing.id);
				console.log(`ℹ️  City already exists (${c.name}) — skipping.`);
				continue;
			}

			const [inserted] = await db
				.insert(cityMaster)
				.values({
					legacyId: c.legacyId,
					name: c.name,
					countryId,
					stateId,
					operatingOfficeId: officeId,
					officeId,
					transportChargeRuleId: transportChargeId,
					maxWeightKg: '200.000',
					categoryCode: 1,
					nationalVatRate: c.nationalVatRate,
					nationalSurchargeRate: c.nationalSurchargeRate,
					isActive: true,
				})
				.returning({ id: cityMaster.id });
			cityIdsByLegacyId.set(c.legacyId, inserted.id);
			console.log(`✅ Created city: ${c.name}`);
		}

		// ---------------------------------------------------------------------
		// 6b. Anzoátegui geography — state + municipalities + cities
		// ---------------------------------------------------------------------
		const [existingAnzoategui] = await db
			.select({ id: stateMaster.id })
			.from(stateMaster)
			.where(eq(stateMaster.legacyId, 9000))
			.limit(1);

		let anzoateguiStateId: string;

		if (existingAnzoategui) {
			anzoateguiStateId = existingAnzoategui.id;
			console.log('ℹ️  State already exists (Anzoátegui) — skipping.');
		} else {
			const [inserted] = await db
				.insert(stateMaster)
				.values({
					legacyId: 9000,
					externalCode: 'ANZ',
					name: 'Anzoátegui',
					shortCode: 'ANZ',
					countryId,
					latitude: '8.5913000',
					longitude: '-63.9586000',
					isActive: true,
				})
				.returning({ id: stateMaster.id });
			anzoateguiStateId = inserted.id;
			console.log('✅ Created state: Anzoátegui');
		}

		const [existingSimonRodriguez] = await db
			.select({ id: municipalityMaster.id })
			.from(municipalityMaster)
			.where(eq(municipalityMaster.legacyId, 9001))
			.limit(1);

		let simonRodriguezMunicipalityId: string;

		if (existingSimonRodriguez) {
			simonRodriguezMunicipalityId = existingSimonRodriguez.id;
			console.log(
				'ℹ️  Municipality already exists (Simón Rodríguez) — skipping.',
			);
		} else {
			const [inserted] = await db
				.insert(municipalityMaster)
				.values({
					legacyId: 9001,
					externalCode: 'SRO',
					stateId: anzoateguiStateId,
					name: 'Simón Rodríguez',
					isActive: true,
				})
				.returning({ id: municipalityMaster.id });
			simonRodriguezMunicipalityId = inserted.id;
			console.log('✅ Created municipality: Simón Rodríguez');
		}

		const [existingElTigre] = await db
			.select({ id: cityMaster.id })
			.from(cityMaster)
			.where(eq(cityMaster.legacyId, 9002))
			.limit(1);

		if (existingElTigre) {
			console.log('ℹ️  City already exists (El Tigre) — skipping.');
		} else {
			await db
				.insert(cityMaster)
				.values({
					legacyId: 9002,
					externalCode: 'TIG',
					name: 'El Tigre',
					normalizedName: 'el tigre',
					countryId,
					stateId: anzoateguiStateId,
					municipalityId: simonRodriguezMunicipalityId,
					latitude: '8.8855000',
					longitude: '-64.2527000',
					supportsCod: true,
					pickupAvailable: true,
					paperDeliveryDisabled: false,
					frequencyMon: true,
					frequencyTue: true,
					frequencyWed: true,
					frequencyThu: true,
					frequencyFri: true,
					frequencySat: false,
					frequencySun: false,
					isActive: true,
				})
				.onConflictDoNothing();
			console.log('✅ Created city: El Tigre');
		}

		const [existingUrbaneja] = await db
			.select({ id: municipalityMaster.id })
			.from(municipalityMaster)
			.where(eq(municipalityMaster.legacyId, 9003))
			.limit(1);

		let urbanejaMunicipalityId: string;

		if (existingUrbaneja) {
			urbanejaMunicipalityId = existingUrbaneja.id;
			console.log(
				'ℹ️  Municipality already exists (Diego Bautista Urbaneja) — skipping.',
			);
		} else {
			const [inserted] = await db
				.insert(municipalityMaster)
				.values({
					legacyId: 9003,
					externalCode: 'DBU',
					stateId: anzoateguiStateId,
					name: 'Diego Bautista Urbaneja',
					isActive: true,
				})
				.returning({ id: municipalityMaster.id });
			urbanejaMunicipalityId = inserted.id;
			console.log('✅ Created municipality: Diego Bautista Urbaneja');
		}

		const [existingLecheria] = await db
			.select({ id: cityMaster.id })
			.from(cityMaster)
			.where(eq(cityMaster.legacyId, 9004))
			.limit(1);

		if (existingLecheria) {
			console.log('ℹ️  City already exists (Lechería) — skipping.');
		} else {
			await db
				.insert(cityMaster)
				.values({
					legacyId: 9004,
					externalCode: 'LEC',
					name: 'Lechería',
					normalizedName: 'lecheria',
					countryId,
					stateId: anzoateguiStateId,
					municipalityId: urbanejaMunicipalityId,
					latitude: '10.1780000',
					longitude: '-64.6939000',
					supportsCod: true,
					pickupAvailable: true,
					paperDeliveryDisabled: false,
					frequencyMon: true,
					frequencyTue: true,
					frequencyWed: true,
					frequencyThu: true,
					frequencyFri: true,
					frequencySat: false,
					frequencySun: false,
					isActive: true,
				})
				.onConflictDoNothing();
			console.log('✅ Created city: Lechería');
		}

		// ---------------------------------------------------------------------
		// 7. Second pass — fill office.cityId now that cities exist
		// ---------------------------------------------------------------------
		await db
			.update(officeMaster)
			.set({ cityId: caracasId })
			.where(eq(officeMaster.legacyId, 46));

		for (const c of REAL_CITIES) {
			const cityId = cityIdsByLegacyId.get(c.legacyId);
			if (!cityId) continue;
			await db
				.update(officeMaster)
				.set({ cityId })
				.where(eq(officeMaster.legacyId, c.officeLegacyId));
		}

		for (const c of FICTIONAL_CITIES) {
			const cityId = cityIdsByLegacyId.get(c.legacyId);
			if (!cityId) continue;
			await db
				.update(officeMaster)
				.set({ cityId })
				.where(eq(officeMaster.legacyId, c.officeLegacyId));
		}

		// ---------------------------------------------------------------------
		// 8. Document types
		// ---------------------------------------------------------------------
		for (const dt of DOCUMENT_TYPES) {
			const [existing] = await db
				.select({ id: documentTypeMaster.id })
				.from(documentTypeMaster)
				.where(eq(documentTypeMaster.legacyId, dt.legacyId))
				.limit(1);

			if (existing) {
				console.log(`ℹ️  Document type already exists (${dt.code}) — skipping.`);
				continue;
			}

			await db
				.insert(documentTypeMaster)
				.values({ ...dt, isActive: true })
				.onConflictDoNothing();
			console.log(`✅ Created document type: ${dt.code} — ${dt.name}`);
		}

		// ---------------------------------------------------------------------
		// 9a. Phone prefixes
		// ---------------------------------------------------------------------
		for (const pp of PHONE_PREFIXES) {
			const [existing] = await db
				.select({ id: phonePrefixMaster.id })
				.from(phonePrefixMaster)
				.where(eq(phonePrefixMaster.legacyId, pp.legacyId))
				.limit(1);

			if (existing) {
				console.log(
					`ℹ️  Phone prefix already exists (${pp.carrierName} ${pp.prefix}) — skipping.`,
				);
				continue;
			}

			await db
				.insert(phonePrefixMaster)
				.values({ ...pp, isActive: true })
				.onConflictDoNothing();
			console.log(
				`ℹ️  Ensured phone prefix exists: ${pp.carrierName} ${pp.prefix}`,
			);
		}

		// ---------------------------------------------------------------------
		// 9b. International phone prefixes
		// ---------------------------------------------------------------------
		for (const ipp of INTERNATIONAL_PHONE_PREFIXES) {
			const [existing] = await db
				.select({ id: phonePrefixMaster.id })
				.from(phonePrefixMaster)
				.where(eq(phonePrefixMaster.legacyId, ipp.legacyId))
				.limit(1);

			if (existing) {
				console.log(
					`ℹ️  Intl phone prefix already exists (${ipp.countryIsoCode} ${ipp.countryPrefix}) — skipping.`,
				);
				continue;
			}

			await db
				.insert(phonePrefixMaster)
				.values({
					legacyId: ipp.legacyId,
					carrierName: ipp.carrierName,
					prefix: ipp.countryPrefix,
					prefixType: 'international',
					scope: 'international',
					countryPrefix: ipp.countryPrefix,
					countryIsoCode: ipp.countryIsoCode,
					isActive: true,
				})
				.onConflictDoNothing();
			console.log(
				`✅ Created intl phone prefix: ${ipp.countryIsoCode} (${ipp.countryPrefix})`,
			);
		}

		// ---------------------------------------------------------------------
		// 10. Unit of measure master (weight & dimension defaults)
		// ---------------------------------------------------------------------
		for (const uom of UNITS_OF_MEASURE) {
			const [existing] = await db
				.select({ id: unitOfMeasureMaster.id })
				.from(unitOfMeasureMaster)
				.where(eq(unitOfMeasureMaster.legacyId, uom.legacyId))
				.limit(1);

			if (existing) {
				console.log(
					`ℹ️  Unit of measure already exists (${uom.code}) — skipping.`,
				);
				continue;
			}

			await db
				.insert(unitOfMeasureMaster)
				.values({ ...uom, isActive: true })
				.onConflictDoNothing();
			console.log(
				`ℹ️  Ensured unit of measure exists: ${uom.code} — ${uom.name}`,
			);
		}

		// ---------------------------------------------------------------------
		// 11. Return type master
		// ---------------------------------------------------------------------
		for (const rt of RETURN_TYPES) {
			const [existing] = await db
				.select({ id: returnTypeMaster.id })
				.from(returnTypeMaster)
				.where(eq(returnTypeMaster.legacyId, rt.legacyId))
				.limit(1);

			if (existing) {
				console.log(`ℹ️  Return type already exists (${rt.name}) — skipping.`);
				continue;
			}

			await db
				.insert(returnTypeMaster)
				.values({ ...rt, isActive: true, finalStatusId: null })
				.onConflictDoNothing();
			console.log(
				`ℹ️  Ensured return type exists: legacyId=${rt.legacyId} — ${rt.name}`,
			);
		}

		// ---------------------------------------------------------------------
		// 12. Shipping services (F3.8) — 37 real services
		// ---------------------------------------------------------------------
		const shippingServiceIdsByLegacyId = new Map<number, string>();
		for (const svc of SHIPPING_SERVICES_FROM_CSV) {
			const [existing] = await db
				.select({ id: shippingServiceMaster.id })
				.from(shippingServiceMaster)
				.where(eq(shippingServiceMaster.legacyId, svc.legacyId))
				.limit(1);

			if (existing) {
				shippingServiceIdsByLegacyId.set(svc.legacyId, existing.id);
				continue;
			}

			const [inserted] = await db
				.insert(shippingServiceMaster)
				.values(svc)
				.returning({ id: shippingServiceMaster.id });
			shippingServiceIdsByLegacyId.set(svc.legacyId, inserted.id);
			console.log(
				`✅ Created shipping service: codservicio=${svc.legacyId} — ${svc.name}`,
			);
		}

		// ---------------------------------------------------------------------
		// 13. Transit matrix (F3.5) — 36 real rows + 20 fictional rows
		// ---------------------------------------------------------------------
		for (const row of TRANSIT_MATRIX_ROWS) {
			const originId = cityIdsByLegacyId.get(row.originLegacyId);
			const destinationId = cityIdsByLegacyId.get(row.destinationLegacyId);
			if (!originId || !destinationId) continue;
			const tag = `${row.originLegacyId}→${row.destinationLegacyId} (weightTypeCode=${row.weightTypeCode})`;
			const inserted = await db
				.insert(transitMatrix)
				.values({
					originCityId: originId,
					destinationCityId: destinationId,
					weightTypeCode: row.weightTypeCode,
					merchandiseDays: row.merchandiseDays,
					documentDays: row.documentDays,
					isActive: true,
				})
				.onConflictDoNothing()
				.returning({ id: transitMatrix.id });
			if (inserted.length === 0) {
				console.log(`ℹ️  Transit matrix already exists (${tag}) — skipping.`);
			} else {
				console.log(`✅ Created transit matrix row: ${tag}`);
			}
		}

		// 20 fictional rows: 5 real origins × 4 fictional destinations × rotating weight type.
		const fictionalOrigins = [40, 29, 16, 25, 33];
		const fictionalDests = FICTIONAL_CITIES.map((c) => c.legacyId);
		const weightTypeRotation = [1, 2, 3, 4];
		let fictionalTransitIdx = 0;
		for (const oLegacy of fictionalOrigins) {
			for (const dLegacy of fictionalDests) {
				const originId = cityIdsByLegacyId.get(oLegacy);
				const destId = cityIdsByLegacyId.get(dLegacy);
				if (!originId || !destId) continue;
				const weightTypeCode =
					weightTypeRotation[fictionalTransitIdx % weightTypeRotation.length];
				fictionalTransitIdx++;
				const tag = `${oLegacy}→${dLegacy} (weightTypeCode=${weightTypeCode}, fictional)`;
				const inserted = await db
					.insert(transitMatrix)
					.values({
						originCityId: originId,
						destinationCityId: destId,
						weightTypeCode,
						merchandiseDays: 5,
						documentDays: 3,
						isActive: true,
					})
					.onConflictDoNothing()
					.returning({ id: transitMatrix.id });
				if (inserted.length === 0) {
					console.log(`ℹ️  Transit matrix already exists (${tag}) — skipping.`);
				} else {
					console.log(`✅ Created transit matrix row: ${tag}`);
				}
			}
		}

		// ---------------------------------------------------------------------
		// 14. Postal tax rules (F3.5) — 8 rows
		// ---------------------------------------------------------------------
		for (const row of POSTAL_TAX_ROWS) {
			const serviceId = shippingServiceIdsByLegacyId.get(row.codservicio);
			if (!serviceId) continue;

			const [existing] = await db
				.select({ id: postalTaxRule.id })
				.from(postalTaxRule)
				.where(eq(postalTaxRule.legacyId, row.legacyId))
				.limit(1);
			if (existing) {
				console.log(
					`ℹ️  Postal tax rule already exists (legacyId=${row.legacyId}, codservicio=${row.codservicio}) — skipping.`,
				);
				continue;
			}

			await db.insert(postalTaxRule).values({
				legacyId: row.legacyId,
				minWeightKg: row.minWeightKg,
				maxWeightKg: row.maxWeightKg,
				taxAmount: row.taxAmount,
				weightTypeCode: row.weightTypeCode,
				shippingServiceId: serviceId,
				zoneCode: row.zoneCode,
				percentage: row.percentage,
				percentageWeight: row.percentageWeight,
				effectiveAt: new Date(`${row.effectiveAt}T00:00:00Z`),
				isActive: true,
			});
			console.log(
				`✅ Created postal tax rule: legacyId=${row.legacyId}, codservicio=${row.codservicio}`,
			);
		}

		// ---------------------------------------------------------------------
		// 15. National overweight rules (F3.5) — 24 real rows + 2 fictional
		// ---------------------------------------------------------------------
		for (const row of NATIONAL_OVERWEIGHT_ROWS) {
			const serviceId = shippingServiceIdsByLegacyId.get(row.codservicio);
			if (!serviceId) continue;

			const [existing] = await db
				.select({ id: nationalOverweightRule.id })
				.from(nationalOverweightRule)
				.where(eq(nationalOverweightRule.legacyId, row.legacyId))
				.limit(1);
			if (existing) {
				console.log(
					`ℹ️  National overweight rule already exists (legacyId=${row.legacyId}, codservicio=${row.codservicio}) — skipping.`,
				);
				continue;
			}

			await db.insert(nationalOverweightRule).values({
				legacyId: row.legacyId,
				overweightAmount: row.overweightAmount,
				minWeightKg: row.minWeightKg,
				maxWeightKg: row.maxWeightKg,
				weightTypeCode: row.weightTypeCode,
				shippingServiceId: serviceId,
				overweightTypeCode: row.overweightTypeCode,
				currencyTypeCode: row.currencyTypeCode,
				effectiveAt: new Date(`${row.effectiveAt}T00:00:00Z`),
				isActive: true,
			});
			console.log(
				`✅ Created national overweight rule: legacyId=${row.legacyId}, codservicio=${row.codservicio}`,
			);
		}

		// F3.7 — 2 fictional rows for codservicio 75 + 76.
		for (const f of FICTIONAL_OVERWEIGHT_RULES) {
			const serviceId = shippingServiceIdsByLegacyId.get(f.serviceLegacyId);
			if (!serviceId) {
				console.warn(
					`⚠️  Fictional overweight rule for codservicio=${f.serviceLegacyId} skipped — service not seeded.`,
				);
				continue;
			}
			const [existing] = await db
				.select({ id: nationalOverweightRule.id })
				.from(nationalOverweightRule)
				.where(eq(nationalOverweightRule.legacyId, f.legacyId))
				.limit(1);
			if (existing) continue;

			await db.insert(nationalOverweightRule).values({
				legacyId: f.legacyId,
				overweightAmount: f.overweightAmount,
				minWeightKg: f.minWeightKg,
				maxWeightKg: f.maxWeightKg,
				weightTypeCode: f.weightTypeCode,
				shippingServiceId: serviceId,
				overweightTypeCode: f.overweightTypeCode,
				currencyTypeCode: null,
				effectiveAt: new Date('2026-04-15T00:00:00Z'),
				isActive: true,
			});
			console.log(
				`✅ Fictional overweight rule legacyId=${f.legacyId} for codservicio=${f.serviceLegacyId}`,
			);
		}

		// ---------------------------------------------------------------------
		// 16. Insurance rules (F3.5) — 3 most-recent-date rows
		// ---------------------------------------------------------------------
		const insuranceEffective = new Date('2026-04-17T00:00:00Z');
		for (const row of INSURANCE_ROWS) {
			const [existing] = await db
				.select({ id: insuranceRule.id })
				.from(insuranceRule)
				.where(eq(insuranceRule.legacyId, row.legacyId))
				.limit(1);
			if (existing) continue;

			await db.insert(insuranceRule).values({
				legacyId: row.legacyId,
				minDeclaredValueAmount: row.minDeclaredValueAmount,
				maxDeclaredValueAmount: row.maxDeclaredValueAmount,
				fixedInsuranceAmount: row.fixedInsuranceAmount,
				percentageInsurance: row.percentageInsurance,
				isKeyRule: row.isKeyRule,
				currencyTypeCode: null,
				effectiveAt: insuranceEffective,
				isActive: true,
			});
			console.log(`✅ Insurance rule legacyId=${row.legacyId}`);
		}

		// ---------------------------------------------------------------------
		// 17. National base rate (E-006 S-001) — 32 most-recent-date rows from
		// basiconac.csv for codservicio ∈ {1, 2}.
		// ---------------------------------------------------------------------
		for (const row of NATIONAL_BASE_RATE_NACIONAL_ROWS) {
			const serviceId = shippingServiceIdsByLegacyId.get(row.codservicio);
			if (!serviceId) {
				console.warn(
					`⚠️  National base rate legacyId=${row.legacyId} skipped — codservicio=${row.codservicio} not seeded.`,
				);
				continue;
			}

			const [existing] = await db
				.select({ id: nationalBaseRate.id })
				.from(nationalBaseRate)
				.where(eq(nationalBaseRate.legacyId, row.legacyId))
				.limit(1);
			if (existing) {
				console.log(
					`ℹ️  National base rate already exists (legacyId=${row.legacyId}) — skipping.`,
				);
				continue;
			}

			await db.insert(nationalBaseRate).values({
				legacyId: row.legacyId,
				minWeightKg: row.minWeightKg,
				maxWeightKg: row.maxWeightKg,
				baseAmount: row.baseAmount,
				shippingServiceId: serviceId,
				weightTypeCode: row.codtipopes,
				baseTypeCode: row.codtipobas,
				countryId,
				currencyTypeCode: 124,
				fpoFactor: 0,
				effectiveAt: new Date(`${row.effectiveAt}T00:00:00Z`),
				isActive: true,
			});
			console.log(
				`✅ Created national base rate: legacyId=${row.legacyId}, codservicio=${row.codservicio}, codtipopes=${row.codtipopes}, codtipobas=${row.codtipobas}`,
			);
		}

		// ---------------------------------------------------------------------
		// 18. Commission rules (E-006 S-001) — 1 real (modalidad=1) + 2
		// fictional (modalidad=2) rows. Comision.csv has very sparse data so
		// the by-value branch is bridged with fixtures.
		// ---------------------------------------------------------------------
		for (const row of COMMISSION_RULE_ROWS) {
			const [existing] = await db
				.select({ id: commissionRule.id })
				.from(commissionRule)
				.where(eq(commissionRule.legacyId, row.legacyId))
				.limit(1);
			if (existing) {
				console.log(
					`ℹ️  Commission rule already exists (legacyId=${row.legacyId}) — skipping.`,
				);
				continue;
			}

			await db.insert(commissionRule).values({
				legacyId: row.legacyId,
				modeType: row.modeType,
				minAmount: row.minAmount,
				maxAmount: row.maxAmount,
				fixedCommissionAmount: row.fixedCommissionAmount,
				percentageCommission: row.percentageCommission,
				currencyTypeCode: 0,
				effectiveAt: new Date(`${row.effectiveAt}T00:00:00Z`),
				isActive: true,
			});
			console.log(
				`✅ Created commission rule: legacyId=${row.legacyId}, modeType=${row.modeType}${row.fictional ? ' (fictional)' : ''}`,
			);
		}

		// ---------------------------------------------------------------------
		// 19. Route master (E-006 S-001) — 10 routes (one per seeded office)
		// supplying per-office weight ceilings (route_master.pesomax).
		// ---------------------------------------------------------------------
		for (const row of ROUTE_MASTER_ROWS) {
			const officeId = officeIdsByLegacyId.get(row.officeLegacyId);
			if (!officeId) {
				console.warn(
					`⚠️  Route legacyId=${row.legacyId} skipped — office legacyId=${row.officeLegacyId} not seeded.`,
				);
				continue;
			}

			const [existing] = await db
				.select({ id: routeMaster.id })
				.from(routeMaster)
				.where(eq(routeMaster.legacyId, row.legacyId))
				.limit(1);
			if (existing) {
				console.log(
					`ℹ️  Route master already exists (legacyId=${row.legacyId}) — skipping.`,
				);
				continue;
			}

			await db.insert(routeMaster).values({
				legacyId: row.legacyId,
				name: row.name,
				returnToOffice: true,
				returnOfficeId: officeId,
				maxWeightKg: row.maxWeightKg,
				isActive: true,
			});
			console.log(
				`✅ Created route master: legacyId=${row.legacyId} → ${row.name} (max ${row.maxWeightKg} kg)`,
			);
		}

		// ---------------------------------------------------------------------
		// 20. National overweight extension (E-006 S-001) — 48 rows for
		// codservicio ∈ {1, 2} extending S-002's casillero-only coverage.
		// ---------------------------------------------------------------------
		for (const row of NATIONAL_OVERWEIGHT_NACIONAL_ROWS) {
			const serviceId = shippingServiceIdsByLegacyId.get(row.codservicio);
			if (!serviceId) continue;

			const [existing] = await db
				.select({ id: nationalOverweightRule.id })
				.from(nationalOverweightRule)
				.where(eq(nationalOverweightRule.legacyId, row.legacyId))
				.limit(1);
			if (existing) {
				console.log(
					`ℹ️  National overweight rule already exists (legacyId=${row.legacyId}) — skipping.`,
				);
				continue;
			}

			await db.insert(nationalOverweightRule).values({
				legacyId: row.legacyId,
				overweightAmount: row.overweightAmount,
				minWeightKg: row.minWeightKg,
				maxWeightKg: row.maxWeightKg,
				weightTypeCode: row.weightTypeCode,
				shippingServiceId: serviceId,
				overweightTypeCode: row.overweightTypeCode,
				currencyTypeCode: 124,
				effectiveAt: new Date(`${row.effectiveAt}T00:00:00Z`),
				isActive: true,
			});
			console.log(
				`✅ Created national overweight rule: legacyId=${row.legacyId}, codservicio=${row.codservicio}`,
			);
		}

		// ---------------------------------------------------------------------
		// 21. Postal tax extension (E-006 S-001) — 4 rows for codservicio
		// ∈ {1, 2} extending S-002's casillero-only coverage.
		// ---------------------------------------------------------------------
		for (const row of POSTAL_TAX_NACIONAL_ROWS) {
			const serviceId = shippingServiceIdsByLegacyId.get(row.codservicio);
			if (!serviceId) continue;

			const [existing] = await db
				.select({ id: postalTaxRule.id })
				.from(postalTaxRule)
				.where(eq(postalTaxRule.legacyId, row.legacyId))
				.limit(1);
			if (existing) {
				console.log(
					`ℹ️  Postal tax rule already exists (legacyId=${row.legacyId}) — skipping.`,
				);
				continue;
			}

			await db.insert(postalTaxRule).values({
				legacyId: row.legacyId,
				minWeightKg: row.minWeightKg,
				maxWeightKg: row.maxWeightKg,
				taxAmount: row.taxAmount,
				weightTypeCode: row.weightTypeCode,
				shippingServiceId: serviceId,
				zoneCode: row.zoneCode,
				percentage: row.percentage,
				percentageWeight: row.percentageWeight,
				effectiveAt: new Date(`${row.effectiveAt}T00:00:00Z`),
				isActive: true,
			});
			console.log(
				`✅ Created postal tax rule: legacyId=${row.legacyId}, codservicio=${row.codservicio}`,
			);
		}

		// ---------------------------------------------------------------------
		// 22. Permission catalog
		// ---------------------------------------------------------------------
		const permissionIds = new Map<string, string>();

		for (const perm of PERMISSIONS) {
			const [existing] = await db
				.select({ id: permissionCatalog.id })
				.from(permissionCatalog)
				.where(eq(permissionCatalog.key, perm.key))
				.limit(1);

			if (existing) {
				permissionIds.set(perm.key, existing.id);
				console.log(`ℹ️  Permission already exists (${perm.key}) — skipping.`);
				continue;
			}

			const [inserted] = await db
				.insert(permissionCatalog)
				.values({
					key: perm.key,
					name: perm.name,
					description: perm.description,
				})
				.returning({ id: permissionCatalog.id });
			permissionIds.set(perm.key, inserted.id);
			console.log(`✅ Created permission: ${perm.key}`);
		}

		// ---------------------------------------------------------------------
		// 23. Role templates
		// ---------------------------------------------------------------------
		const roleTemplateIds = new Map<string, string>();

		for (const tmpl of ROLE_TEMPLATES) {
			const [existing] = await db
				.select({ id: roleTemplate.id })
				.from(roleTemplate)
				.where(eq(roleTemplate.key, tmpl.key))
				.limit(1);

			if (existing) {
				roleTemplateIds.set(tmpl.key, existing.id);
				console.log(
					`ℹ️  Role template already exists (${tmpl.key}) — skipping.`,
				);
				continue;
			}

			const [inserted] = await db
				.insert(roleTemplate)
				.values({
					key: tmpl.key,
					name: tmpl.name,
					description: tmpl.description,
				})
				.returning({ id: roleTemplate.id });
			roleTemplateIds.set(tmpl.key, inserted.id);
			console.log(`✅ Created role template: ${tmpl.key} — ${tmpl.name}`);
		}

		// ---------------------------------------------------------------------
		// 24. Role template × service defaults
		// ---------------------------------------------------------------------
		for (const [templateKey, templateId] of roleTemplateIds) {
			for (const key of shippingServiceKeyEnum.enumValues) {
				await db
					.insert(roleTemplateService)
					.values({
						roleTemplateId: templateId,
						key,
						enabled: true,
					})
					.onConflictDoNothing();
				console.log(
					`ℹ️  Ensured role_template_service: ${templateKey} × ${key}`,
				);
			}
		}

		// ---------------------------------------------------------------------
		// 25. Role template × permission defaults
		// ---------------------------------------------------------------------
		for (const [templateKey, templateId] of roleTemplateIds) {
			for (const [permKey, permId] of permissionIds) {
				const allowed = !(
					templateKey === 'operator' && permKey === 'view_reports'
				);

				await db
					.insert(roleTemplatePermission)
					.values({ roleTemplateId: templateId, permissionId: permId, allowed })
					.onConflictDoNothing();
				console.log(
					`ℹ️  Ensured role_template_permission: ${templateKey} × ${permKey} (allowed=${allowed})`,
				);
			}
		}

		// ---------------------------------------------------------------------
		// 26. Lockers (F3.9) — env-driven, round-robin across offices
		// ---------------------------------------------------------------------
		const rawIds = process.env.SEED_LOCKER_BUSINESS_ACCOUNT_IDS ?? '';
		// Accept both `uuid1,uuid2` and `["uuid1","uuid2"]` shapes — strip the
		// JSON-array decorations (brackets, quotes, whitespace) per piece.
		const businessAccountIds = rawIds
			.split(',')
			.map((s) => s.trim().replace(/^[[\]"' ]+|[[\]"' ]+$/g, ''))
			.filter((s) => s.length > 0);

		if (businessAccountIds.length === 0) {
			console.log(
				'ℹ️  SEED_LOCKER_BUSINESS_ACCOUNT_IDS empty — skipping locker seed.',
			);
		} else {
			// Round-robin office order: CCS → 5 real (VLP, CAB, SAT, AGV, BNS) →
			// 4 fictional (TRB, TRA, IEX, null-siglas). Order is intentional so a
			// single-UUID setup tests the MVP primary case (codservicio=18, CCS).
			const officeOrder: number[] = [
				46,
				...REAL_CITIES.map((c) => c.officeLegacyId),
				...FICTIONAL_CITIES.map((c) => c.officeLegacyId),
			];

			if (businessAccountIds.length > officeOrder.length) {
				console.warn(
					`⚠️  ${businessAccountIds.length} UUIDs provided but only ${officeOrder.length} offices are seeded; processing the first ${officeOrder.length}.`,
				);
			}

			const codservicioRotation = [18, 21];

			for (
				let i = 0;
				i < Math.min(businessAccountIds.length, officeOrder.length);
				i++
			) {
				const accountId = businessAccountIds[i];
				const officeLegacyId = officeOrder[i];
				const officeId = officeIdsByLegacyId.get(officeLegacyId);
				const codservicio = codservicioRotation[i % codservicioRotation.length];
				const serviceId = shippingServiceIdsByLegacyId.get(codservicio);

				if (!officeId || !serviceId) {
					console.warn(
						`⚠️  Skipping locker #${i + 1} — office or service not seeded.`,
					);
					continue;
				}

				// Validate business_account UUID exists.
				const [account] = await db
					.select({ id: businessAccount.id })
					.from(businessAccount)
					.where(eq(businessAccount.id, accountId))
					.limit(1);
				if (!account) {
					throw new Error(
						`SEED_LOCKER_BUSINESS_ACCOUNT_IDS contains UUID "${accountId}" which does not exist in business_account.`,
					);
				}

				const lockerLegacyId = 800000 + i;
				const [existing] = await db
					.select({ id: lockerMaster.id })
					.from(lockerMaster)
					.where(eq(lockerMaster.legacyId, lockerLegacyId))
					.limit(1);
				if (existing) {
					console.log(
						`ℹ️  Locker already exists (legacyId=${lockerLegacyId}) — skipping.`,
					);
					continue;
				}

				await db.insert(lockerMaster).values({
					legacyId: lockerLegacyId,
					contactName: `Contacto de Prueba ${i + 1}`,
					officeMasterId: officeId,
					shippingServiceMasterId: serviceId,
					businessAccountId: accountId,
					legacyGlobalLockerId: 0,
					isActive: true,
					isDeleted: false,
				});
				console.log(
					`✅ Locker legacyId=${lockerLegacyId} → office=${officeLegacyId}, codservicio=${codservicio}, account=${accountId}`,
				);
			}
		}

		console.log('✅ Seed complete.');
	} finally {
		await pool.query('SELECT pg_advisory_unlock($1::bigint)', [
			SEED_ADVISORY_LOCK_KEY.toString(),
		]);
		await pool.end();
	}
}

main().catch((err) => {
	console.error('❌ Seed failed:', err);
	process.exit(1);
});
