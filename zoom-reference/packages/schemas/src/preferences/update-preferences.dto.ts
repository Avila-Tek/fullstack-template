import { getEnumObjectFromArray } from '@zoom/utils';
import { z } from 'zod';

export const unitOfMeasureSchema = z.object({
  id: z.uuid(),
  code: z.string(),
  name: z.string(),
  unitTypeCode: z.number().int(),
});
export type TUnitOfMeasure = z.infer<typeof unitOfMeasureSchema>;

export const getPreferencesOutputSchema = z.object({
  weightUnit: unitOfMeasureSchema.nullable(),
  dimensionUnit: unitOfMeasureSchema.nullable(),
});
export type TGetPreferencesOutput = z.infer<typeof getPreferencesOutputSchema>;

export const updatePreferencesInputSchema = z
  .object({
    weightUnitId: z.uuid().optional(),
    dimensionUnitId: z.uuid().optional(),
  })
  .refine((data) => data.weightUnitId || data.dimensionUnitId, {
    message: 'At least one unit ID must be provided',
  });
export type TUpdatePreferencesInput = z.infer<
  typeof updatePreferencesInputSchema
>;

export const getShippingUnitsOutputSchema = z.object({
  weightUnits: z.array(unitOfMeasureSchema),
  dimensionUnits: z.array(unitOfMeasureSchema),
});
export type TGetShippingUnitsOutput = z.infer<
  typeof getShippingUnitsOutputSchema
>;

const notificationPreferenceValues = ['all', 'none'] as const;
export const NOTIFICATION_PREFERENCES = getEnumObjectFromArray(
  notificationPreferenceValues
);

export const notificationPreferenceOutputSchema = z.object({
  preference: z.enum(notificationPreferenceValues),
});
export type TNotificationPreferenceOutput = z.infer<
  typeof notificationPreferenceOutputSchema
>;

export const updateNotificationPreferenceInputSchema = z.object({
  preference: z.enum(notificationPreferenceValues),
});
export type TUpdateNotificationPreferenceInput = z.infer<
  typeof updateNotificationPreferenceInputSchema
>;
