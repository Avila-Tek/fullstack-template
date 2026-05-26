import { z } from 'zod';
import { permissionKeySchema } from '../shared/permission-set.schema';
import { shippingServiceKeySchema } from '../shared/shipping-service-enums.schema';

// ---------------------------------------------------------------------------
// roleTemplateListItemSchema — single item in list response
// ---------------------------------------------------------------------------

export const roleTemplateListItemSchema = z.object({
  id: z.uuid(),
  key: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable(),
});

export type TRoleTemplateListItem = z.infer<typeof roleTemplateListItemSchema>;

// ---------------------------------------------------------------------------
// roleTemplatesListOutputSchema — GET /api/v1/role-templates response data
// ---------------------------------------------------------------------------

export const roleTemplatesListOutputSchema = z.array(
  roleTemplateListItemSchema
);

export type TRoleTemplatesListOutput = z.infer<
  typeof roleTemplatesListOutputSchema
>;

// ---------------------------------------------------------------------------
// roleTemplateServiceItemSchema — service entry in detail response
// ---------------------------------------------------------------------------

export const roleTemplateServiceItemSchema = z.object({
  key: shippingServiceKeySchema,
  enabled: z.boolean(),
});

export type TRoleTemplateServiceItem = z.infer<
  typeof roleTemplateServiceItemSchema
>;

// ---------------------------------------------------------------------------
// roleTemplatePermissionItemSchema — permission entry in detail response
// ---------------------------------------------------------------------------

export const roleTemplatePermissionItemSchema = z.object({
  key: permissionKeySchema,
  allowed: z.boolean(),
});

export type TRoleTemplatePermissionItem = z.infer<
  typeof roleTemplatePermissionItemSchema
>;

// ---------------------------------------------------------------------------
// roleTemplateDetailOutputSchema — GET /api/v1/role-templates/:id response data
// ---------------------------------------------------------------------------

export const roleTemplateDetailOutputSchema = roleTemplateListItemSchema.extend(
  {
    services: z.array(roleTemplateServiceItemSchema),
    permissions: z.array(roleTemplatePermissionItemSchema),
  }
);

export type TRoleTemplateDetailOutput = z.infer<
  typeof roleTemplateDetailOutputSchema
>;
