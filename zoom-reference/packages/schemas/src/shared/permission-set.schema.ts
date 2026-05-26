import { z } from 'zod';
import {
  SHIPPING_SERVICE_KEY_VALUES,
  shippingServiceKeySchema,
  type TShippingServiceKey,
} from './shipping-service-enums.schema';

// ---------------------------------------------------------------------------
// Permission key enum schema
// ---------------------------------------------------------------------------

export const PERMISSION_KEY_VALUES = [
  'share_guide_recipients',
  'share_locker_recipients',
  'view_reports',
] as const;

export const permissionKeySchema = z.enum(PERMISSION_KEY_VALUES);

export type TPermissionKey = z.infer<typeof permissionKeySchema>;

// ---------------------------------------------------------------------------
// Permission sub-schemas
// ---------------------------------------------------------------------------

export const persistServicePermissionSchema = z.object({
  key: shippingServiceKeySchema,
  enabled: z.boolean(),
  whitelistEnabled: z.boolean().default(false),
  recipientIds: z.array(z.uuid()).default([]),
});

export const persistFunctionalPermissionSchema = z.object({
  key: permissionKeySchema,
  allowed: z.boolean(),
});

export const permissionSetSchema = z.object({
  roleTemplateId: z.uuid().optional(),
  servicePermissions: z
    .array(persistServicePermissionSchema)
    .refine(
      (arr) =>
        new Set(arr.map((s) => s.key)).size ===
        SHIPPING_SERVICE_KEY_VALUES.length,
      {
        message:
          'servicePermissions must contain all shipping service keys exactly once',
      }
    ),
  functionalPermissions: z
    .array(persistFunctionalPermissionSchema)
    .refine(
      (arr) =>
        new Set(arr.map((p) => p.key)).size === PERMISSION_KEY_VALUES.length,
      {
        message:
          'functionalPermissions must contain all permission keys exactly once',
      }
    ),
});

export type TServicePermissionInput = z.infer<
  typeof persistServicePermissionSchema
>;
export type TFunctionalPermissionInput = z.infer<
  typeof persistFunctionalPermissionSchema
>;
export type TPermissionSet = z.infer<typeof permissionSetSchema>;

// ---------------------------------------------------------------------------
// computeIsCustomized — pure comparison by key
// ---------------------------------------------------------------------------

/**
 * Returns true if the submitted service permissions differ from the template
 * defaults in any way (missing key, different enabled flag).
 */
export function computeIsCustomized(
  servicePermissions: TServicePermissionInput[],
  templateServices: Array<{
    key: TShippingServiceKey;
    enabled: boolean;
  }> | null
): boolean {
  if (!templateServices) return true;

  const defaultMap = new Map(templateServices.map((s) => [s.key, s.enabled]));
  if (servicePermissions.length !== defaultMap.size) return true;
  for (const submitted of servicePermissions) {
    const defaultEnabled = defaultMap.get(submitted.key);
    if (defaultEnabled === undefined || defaultEnabled !== submitted.enabled) {
      return true;
    }
  }
  return false;
}
