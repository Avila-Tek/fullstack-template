import { z } from 'zod';
import {
  destinationTypeSchema,
  paymentTypeSchema,
  productTypeSchema,
} from '../shared/shipping-service-enums.schema';

// ---------------------------------------------------------------------------
// E-006 S-001 — National guía pricing (Domicilio / Retiro en oficina)
// ---------------------------------------------------------------------------
//
// Request: POST /api/v1/pricing/national/calculate
//
// This schema is the WIRE contract — what the client sends. Server-injected
// fields (`bcvRate` from the orchestrator's `x-bcv-rate` header) live in an
// internal command type defined in `apps/api`'s port layer; they are not
// cross-service information and therefore do not belong in `@zoom/schemas`.
//
//   - paymentType=origin       → Nacional contado (pago en origen). IVA on origin.
//   - paymentType=destination  → COD / pago en destino. IVA on destination,
//                                commission applies only for this branch.
//   - destinationType=office   → destinationOfficeId is REQUIRED (retiro en oficina).
//   - destinationType=home     → door-to-door delivery (Domicilio). Office id ignored.
//   - declaredValueUsd defaults to 0 (no insurance). The use case converts
//                                this to Bs internally via the BCV rate.
//   - productType is for SLA display only (`package` = mercancía,
//                                `document` = documento). NOT used in pricing.
//
// DESIGN DECISION — `originCityId` is a CLIENT input (selected in the frontend
// city picker), NOT resolved server-side from the caller's business
// profile / business account. See the original story spec for the trade-offs.
// ---------------------------------------------------------------------------

export const calculateNationalPricingCommandSchema = z
  .object({
    paymentType: paymentTypeSchema,
    destinationType: destinationTypeSchema,
    weightKg: z.number().positive(),
    declaredValueUsd: z.number().min(0).default(0),
    originCityId: z.uuid(),
    destinationCityId: z.uuid(),
    destinationOfficeId: z.uuid().optional(),
    productType: productTypeSchema.optional(),
  })
  .refine(
    (cmd) =>
      cmd.destinationType !== 'office' || cmd.destinationOfficeId !== undefined,
    {
      message: 'destinationOfficeId is required when destinationType is office',
      path: ['destinationOfficeId'],
    }
  );
export type TCalculateNationalPricingCommand = z.infer<
  typeof calculateNationalPricingCommandSchema
>;

// ---------------------------------------------------------------------------
// E-006 S-001 — National guía quote limits
// ---------------------------------------------------------------------------
//
// Request:  GET /api/v1/pricing/national/quote-limits
// Purpose:  Powers client-side validation of the Weight and Declared Value
//           inputs in the cotizador. Mirrors the two pre-calculation guards
//           the use case enforces server-side
//           (`WeightExceedsLimitException`, `DeclaredValueOutOfRangeException`)
//           so the form can reject out-of-range values without a round trip
//           to the calculate endpoint.
//
// Both destination types require `destinationCityId` — the office branch
// uses the city's `pesomax` as a fallback when no `ruta.pesomax` row is
// configured for the selected office.
// ---------------------------------------------------------------------------

export const nationalQuoteLimitsQuerySchema = z
  .object({
    destinationType: destinationTypeSchema,
    destinationCityId: z.uuid(),
    destinationOfficeId: z.uuid().optional(),
  })
  .refine(
    (q) =>
      q.destinationType !== 'office' || q.destinationOfficeId !== undefined,
    {
      message: 'destinationOfficeId is required when destinationType is office',
      path: ['destinationOfficeId'],
    }
  );
export type TNationalQuoteLimitsQuery = z.infer<
  typeof nationalQuoteLimitsQuerySchema
>;

// WIRE response shape. Bounds are USD-denominated — the use case projects
// internal Bs bounds via `convertBsToUsd` before returning so the frontend
// can validate `declaredValueUsd` client-side without a second roundtrip.
export const nationalQuoteLimitsResponseSchema = z.object({
  // Upper bound only — the use case validates `weightKg > max`, no minimum.
  weightKg: z.object({ max: z.number().positive() }),
  // `null` when no insurance rule is active today — matches the use case,
  // which skips declared-value validation entirely in that case.
  declaredValueUsd: z
    .object({
      min: z.number().nonnegative(),
      max: z.number().positive(),
    })
    .nullable(),
});
export type TNationalQuoteLimitsResponse = z.infer<
  typeof nationalQuoteLimitsResponseSchema
>;

export const nationalPricingResponseSchema = z.object({
  // Breakdown fields shown in the UI cost panel.
  baseFreight: z.number(), // basico (with complement applied)
  overweight: z.number(), // sobrepeso (with complement applied)
  transportCharge: z.number(), // traslado (no complement — legacy 2019-11-19)
  freight: z.number(), // basico + sobrepeso + traslado [+ comision when destination]
  commission: z.number(), // 0 for paymentType=origin
  insurance: z.number(), // SUMMED into subtotal for Nacional (unlike Casillero)
  subtotal: z.number(), // freight + insurance
  vat: z.number(), // subtotal * vatRate / 100
  vatPercentage: z.number(), // rate used for vat (origin-city or dest-city IVA)
  postalTax: z.number(), // franqueo postal (complement-corrected path)
  total: z.number(), // subtotal + vat + postalTax
  bcvRate: z.number(), // Bs/USD exchange rate at quote time
  totalUsd: z.number(), // round(total / bcvRate, 2)

  // AC-06 — SLA display. `null` when no transit_matrix row exists for the O/D
  // pair (non-blocking: pricing still succeeds).
  transitEstimate: z
    .object({
      merchandiseDays: z.number().nullable(),
      documentDays: z.number().nullable(),
    })
    .nullable(),

  // Collapsible detail block — pricing internals for audit / debugging.
  detail: z.object({
    overweightHalfKilos: z.number(),
    weightTypeCode: z.number(),
    baseTypeCode: z.number(),
    overweightTypeCode: z.number(),
    complementPercentage: z.number(),
    transportChargeRuleId: z.string().nullable(),
  }),
});
export type TNationalPricingResponse = z.infer<
  typeof nationalPricingResponseSchema
>;
