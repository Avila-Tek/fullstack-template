import { z } from 'zod';
import { SomeType } from 'zod/v4/core';

// ---------------------------------------------------------------------------
// Zod ↔ form validation bridge
// Uses structural typing so it works in Angular (ValidatorFn), React, or NestJS
// without importing framework-specific types.
// ---------------------------------------------------------------------------

/** Minimal control interface — structurally compatible with Angular's AbstractControl. */
interface ZodControl {
  value: unknown;
}

/**
 * Wraps a Zod schema as a form field validator.
 * - Angular: assign directly as a `ValidatorFn` (structurally compatible).
 * - NestJS / plain TS: call with `{ value: data }` to get errors.
 *
 * Returns `{ zod: '<message>' }` on failure, `null` on success.
 */
export function zodFieldValidator<T>(
  schema: z.ZodType<T>
): (control: ZodControl) => Record<string, string> | null {
  return (control: ZodControl): Record<string, string> | null => {
    const result = schema.safeParse(control.value);
    if (result.success) return null;
    return { zod: result.error.issues[0]?.message ?? 'Invalid value' };
  };
}

export function buildSafeResponseSchema<T extends SomeType>(schema: T) {
  const safeSchema = z.discriminatedUnion('success', [
    z.object({
      success: z.literal(false),
      error: z.string(),
    }),
    z.object({
      success: z.literal(true),
      data: schema,
    }),
  ]);
  return safeSchema;
}

export const zDateToIsoNullableOpt = z
  .union([z.date(), z.string(), z.null(), z.undefined()])
  .transform((v) => (v instanceof Date ? v.toISOString() : v));
