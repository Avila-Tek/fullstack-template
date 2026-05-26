import { z } from 'zod';
import { permissionKeySchema } from '../shared/permission-set.schema';
import {
  paymentTypeSchema,
  recipientTypeSchema,
  shippingScopeSchema,
  shippingServiceKeySchema,
} from '../shared/shipping-service-enums.schema';

export const servicePermissionReadItemSchema = z.object({
  key: shippingServiceKeySchema,
  shippingScope: shippingScopeSchema,
  recipientType: recipientTypeSchema.nullable(),
  paymentType: paymentTypeSchema.nullable(),
  enabled: z.boolean(),
  whitelistEnabled: z.boolean(),
  recipientCount: z.number().int().nonnegative().nullable(),
});

export const functionalPermissionReadItemSchema = z.object({
  key: permissionKeySchema,
  allowed: z.boolean(),
});

export const memberPermissionsReadSchema = z.object({
  servicePermissions: z.array(servicePermissionReadItemSchema),
  functionalPermissions: z.array(functionalPermissionReadItemSchema),
});

export type TServicePermissionReadItem = z.infer<
  typeof servicePermissionReadItemSchema
>;
export type TFunctionalPermissionReadItem = z.infer<
  typeof functionalPermissionReadItemSchema
>;
export type TMemberPermissionsRead = z.infer<
  typeof memberPermissionsReadSchema
>;
