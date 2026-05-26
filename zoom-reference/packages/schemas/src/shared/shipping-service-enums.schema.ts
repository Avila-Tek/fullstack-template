import { z } from 'zod';

// ---------------------------------------------------------------------------
// Shipping service enum schemas — mirror the Postgres enums in apps/api
// Centralized source of truth for shipping service, scope, recipient type, and payment type
// ---------------------------------------------------------------------------

export const SHIPPING_SERVICE_KEY_VALUES = [
  'national_guia_origin',
  'national_guia_destination',
  'national_locker',
  'international',
] as const;

export const shippingServiceKeySchema = z.enum(SHIPPING_SERVICE_KEY_VALUES);

export const shippingScopeSchema = z.enum(['national', 'international']);

export const recipientTypeSchema = z.enum(['locker', 'guia']);

export const paymentTypeSchema = z.enum(['origin', 'destination']);

// UI discriminator — differentiates home vs office delivery within 'guia' recipient type.
// Both map to recipientType = 'guia' at the backend; destinationType drives which fields
// the form shows (office requires destination-office select; home does not).
export const destinationTypeSchema = z.enum(['home', 'office']);

// Product type for a shipment: physical package (mercancía) or document.
export const productTypeSchema = z.enum(['package', 'document']);

// ---------------------------------------------------------------------------
// Type exports
// ---------------------------------------------------------------------------

export type TShippingServiceKey = z.infer<typeof shippingServiceKeySchema>;
export type TShippingScope = z.infer<typeof shippingScopeSchema>;
export type TRecipientType = z.infer<typeof recipientTypeSchema>;
export type TPaymentType = z.infer<typeof paymentTypeSchema>;
export type TDestinationType = z.infer<typeof destinationTypeSchema>;
export type TProductType = z.infer<typeof productTypeSchema>;

// ---------------------------------------------------------------------------
// Key → tuple mapping (domain knowledge shared across apps and packages)
// ---------------------------------------------------------------------------

type TShippingServiceTuple = {
  shippingScope: TShippingScope;
  recipientType: TRecipientType | null;
  paymentType: TPaymentType | null;
};

export const SHIPPING_SERVICE_KEY_TUPLES: Record<
  TShippingServiceKey,
  TShippingServiceTuple
> = {
  national_guia_origin: {
    shippingScope: 'national',
    recipientType: 'guia',
    paymentType: 'origin',
  },
  national_guia_destination: {
    shippingScope: 'national',
    recipientType: 'guia',
    paymentType: 'destination',
  },
  national_locker: {
    shippingScope: 'national',
    recipientType: 'locker',
    paymentType: null,
  },
  international: {
    shippingScope: 'international',
    recipientType: null,
    paymentType: null,
  },
};
