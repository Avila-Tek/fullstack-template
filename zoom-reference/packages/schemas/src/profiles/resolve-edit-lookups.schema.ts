import { z } from 'zod';

// ---------------------------------------------------------------------------
// Internal lookup — POST /internal/profiles/resolve-edit-lookups
// Resolves phonePrefixId → prefixValue and cityId → cityLegacyId
// for the orchestrator's CORE sync call.
// ---------------------------------------------------------------------------

export const resolveEditLookupsInputSchema = z.object({
  documentTypeId: z.string().uuid().optional(),
  phonePrefixId: z.string().uuid().optional(),
  stateId: z.string().uuid().optional(),
  cityId: z.string().uuid().optional(),
});

export type TResolveEditLookupsInput = z.infer<
  typeof resolveEditLookupsInputSchema
>;

export const resolveEditLookupsOutputSchema = z.object({
  documentTypeValue: z.string().nullable(),
  phonePrefixValue: z.string().nullable(),
  stateName: z.string().nullable(),
  cityName: z.string().nullable(),
  cityLegacyId: z.number().nullable(),
});

export type TResolveEditLookupsOutput = z.infer<
  typeof resolveEditLookupsOutputSchema
>;
