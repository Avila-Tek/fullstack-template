import { getEnumObjectFromArray } from '@zoom/utils';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Schemas for the Casillero pricing endpoints (E-006 S-002).
// ---------------------------------------------------------------------------

// `locker_master.legacy_id` is a PostgreSQL `integer` column (signed
// int32). Any value above this overflows on the DB and surfaces as a
// "value out of range" 500 — reject it at the validation pipe instead so
// the response is a clean 400.
const POSTGRES_INT32_MAX = 2_147_483_647;

// Query params for `GET /api/v1/catalog/lockers/validate`.
//
// `siglas` is the 3-character office code (legacy `oficina.siglas`).
// `lockerNumber` is the locker's legacy id (legacy `casillero.codcasillero`).
// Both are required for the validation predicate.
export const validateLockerQuerySchema = z.object({
  siglas: z.string().length(3),
  lockerNumber: z.coerce.number().int().min(1).max(POSTGRES_INT32_MAX),
});
export type TValidateLockerQuery = z.infer<typeof validateLockerQuerySchema>;

export const lockerValidationResponseSchema = z.object({
  valid: z.boolean(),
});
export type TLockerValidationResponse = z.infer<
  typeof lockerValidationResponseSchema
>;

// ---------------------------------------------------------------------------
// `POST /api/v1/pricing/casillero/calculate` — request shape (wire)
// ---------------------------------------------------------------------------
//
// This schema is the WIRE contract. Server-injected fields (`originCityId`
// resolved from the authenticated user's billing address; `bcvRate` from the
// orchestrator's `x-bcv-rate` header) live in an internal command type
// defined in `apps/api`'s port layer — they are not cross-service information
// and therefore do not belong in `@zoom/schemas`.

export const calculateLockerPricingCommandSchema = z.object({
  // Office code — `oficina.siglas` in legacy. Always 3 characters.
  siglas: z.string().length(3),
  // Locker legacy_id — `casillero.codcasillero` in legacy. Bounded by the
  // PostgreSQL `integer` column (POSTGRES_INT32_MAX) to keep overflow
  // errors from reaching the DB.
  lockerNumber: z.number().int().min(1).max(POSTGRES_INT32_MAX),
  // Shipment weight in kg, > 0. LEGACY: was `peso`.
  weight: z.number().positive(),
  // Declared value in USD, optional. The use case converts to Bs via the
  // BCV rate before computing insurance.
  declaredValueUsd: z.number().nonnegative().optional(),
});
export type TCalculateLockerPricingCommand = z.infer<
  typeof calculateLockerPricingCommandSchema
>;

// ---------------------------------------------------------------------------
// `POST /api/v1/pricing/casillero/calculate` — internal response shape
// ---------------------------------------------------------------------------
//
// The shape mirrors the cost-panel UI 1:1 so the client renders each field
// without computing anything. All fields are ALWAYS present — values default
// to 0 when the field doesn't apply to the current branch (e.g. `freight = 0`
// on the flat branch). See spec_back.md §Task 5.1 "Response" for the
// per-field semantics.
//
// Note: `insurance` is COMPUTED and SURFACED but NOT summed into `subtotal`
// or `total` for Casillero (§5.7 peculiarity #3). The UI may render it with
// an explanatory badge — that's a frontend concern.

// Branch discriminator — typed-array enum pattern (no magic strings).
export const lockerPricingBranches = ['with_freight', 'flat'] as const;
export type TLockerPricingBranch = (typeof lockerPricingBranches)[number];
export const LOCKER_PRICING_BRANCHES = getEnumObjectFromArray(
  lockerPricingBranches
);

export const lockerPricingDetailSchema = z.object({
  weightTypeCode: z.number().int(),
  // LEGACY: was `codtraslado`. UUID of the matched transport_charge_rule;
  // null when no rule applies (flat branch).
  transportChargeCode: z.string().nullable(),
  // LEGACY: was `kilossob` (PHP helper `_kiloSobrePes`). MISNOMER preserved
  // for paridad with legacy field names: the value is a COUNT OF 500 g
  // CHUNKS above the city's `pesomax` threshold, NOT a kilogram measurement.
  // A 1.5 kg overage yields 3 (= ceil(1.5 / 0.5)), not 1.5. The overweight
  // billing rule multiplies this count by a Bs-per-chunk rate.
  overweightKilos: z.number(),
  // Raw amount (informational; folded into `freight` on with-freight branch).
  overweightAmount: z.number(),
  transportCharge: z.number(),
  complementPercentage: z.number(),
});
export type TLockerPricingDetail = z.infer<typeof lockerPricingDetailSchema>;

export const lockerPricingResponseSchema = z.object({
  // Identification
  serviceCode: z.number().int(),
  branch: z.enum(lockerPricingBranches),

  // Frontend cost-panel rows (Bs)
  freight: z.number(),
  insurance: z.number(),
  subtotal: z.number(),
  vat: z.number(),
  vatPercentage: z.number(),
  postalTax: z.number(),
  total: z.number(),
  bcvRate: z.number(),
  totalUsd: z.number(),

  // "Ver detalle" collapsible block
  detail: lockerPricingDetailSchema,
});
export type TLockerPricingResponse = z.infer<
  typeof lockerPricingResponseSchema
>;

// ---------------------------------------------------------------------------
// `POST /api/v1/pricing/casillero/calculate` — PUBLIC response shape (wire)
// ---------------------------------------------------------------------------
//
// What the controller actually returns over HTTP. The use case computes the
// full `lockerPricingResponseSchema` (legacy-parity diagnostics + branch hint
// for server-side logs/telemetry); the controller projects it down to the
// 8 fields the Cotizador "Costo estimado" panel actually renders (see Figma
// design + spec_funcional Flujo B + national-pricing-calculation.md §5.6).
//
// Field-to-panel mapping:
//   freight     → "Flete (Bs)"
//   insurance   → "Protección de encomienda (Bs)"
//   subtotal    → "Subtotal (Bs)"
//   vat         → "IVA (Bs)"
//   postalTax   → "Franqueo postal (Bs)"
//   total       → "Total a pagar (Bs)"
//   bcvRate     → "Tasa de cambio (Bs/USD)"
//   totalUsd    → "USD <value>"
//
// Casillero semantics preserved (see §5.7 peculiarities):
//   - flat branch → freight / vat = 0, only postalTax contributes to total
//   - insurance is informational (NOT summed into subtotal/total) — § peculiarity #3
//
// Internal-only fields that DO NOT cross the wire: serviceCode, branch,
// vatPercentage, and the entire `detail` block. The use case still produces
// them for logs / future UI needs; the controller strips them in its mapper.
export const lockerPricingPublicResponseSchema = z.object({
  freight: z.number(),
  insurance: z.number(),
  subtotal: z.number(),
  vat: z.number(),
  postalTax: z.number(),
  total: z.number(),
  bcvRate: z.number(),
  totalUsd: z.number(),
});
export type TLockerPricingPublicResponse = z.infer<
  typeof lockerPricingPublicResponseSchema
>;
