import { z } from 'zod';

// ---------------------------------------------------------------------------
// Entity document type codes
// Not a fixed enum — actual valid codes are master-table driven.
// These are the codes that use legalName instead of firstName + lastName.
// ---------------------------------------------------------------------------

export const entityDocumentTypes: readonly string[] = ['J', 'G'];

// ---------------------------------------------------------------------------
// documentInputSchema — document fields at a public API boundary.
// Includes regex so the format is caught as early as possible.
// ---------------------------------------------------------------------------

export const documentInputSchema = z.object({
  documentType: z.string().min(1),
  documentNumber: z
    .string()
    .regex(
      /^[A-Z0-9]{1,20}$/i,
      'Document number must be 1–20 alphanumeric characters'
    ),
});

export type TDocumentInput = z.infer<typeof documentInputSchema>;

// ---------------------------------------------------------------------------
// phoneInputSchema — phone fields at a public API boundary.
// ---------------------------------------------------------------------------

export const phoneInputSchema = z.object({
  phonePrefix: z
    .string()
    .regex(
      /^0\d{2,3}$/,
      'Phone prefix must start with 0 followed by 2–3 digits'
    ),
  phoneNumber: z
    .string()
    .regex(/^\d{7}$/, 'Phone number must be exactly 7 digits'),
});

export type TPhoneInput = z.infer<typeof phoneInputSchema>;

// ---------------------------------------------------------------------------
// profileNamesSchema — firstName / lastName / legalName.
// All fields are optional at the schema level; use refineProfileNames() to
// enforce which combination is required for a given documentType.
// ---------------------------------------------------------------------------

export const profileNamesSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  legalName: z.string().min(1).max(200).optional(),
});

export type TProfileNames = z.infer<typeof profileNamesSchema>;

// ---------------------------------------------------------------------------
// refineProfileNames — superRefine helper.
// Call inside .superRefine() on any schema that includes both documentType
// and the profile name fields.
// ---------------------------------------------------------------------------

export function refineProfileNames(
  data: { documentType: string } & TProfileNames,
  ctx: z.RefinementCtx
): void {
  const normalizedDocumentType = (data.documentType ?? '').toUpperCase();
  const isEntity = entityDocumentTypes.includes(normalizedDocumentType);

  if (isEntity) {
    if (!data.legalName) {
      ctx.addIssue({
        code: 'custom',
        path: ['legalName'],
        message: `legalName is required for documentType "${normalizedDocumentType}"`,
      });
    }
  } else {
    if (!data.firstName) {
      ctx.addIssue({
        code: 'custom',
        path: ['firstName'],
        message: `firstName is required for documentType "${normalizedDocumentType}"`,
      });
    }
    if (!data.lastName) {
      ctx.addIssue({
        code: 'custom',
        path: ['lastName'],
        message: `lastName is required for documentType "${normalizedDocumentType}"`,
      });
    }
  }
}
