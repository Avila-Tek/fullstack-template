import { z } from 'zod';

const metadataSchema = z.record(z.string(), z.string());

const checkoutSessionInput = z.object({
  billingIdentityId: z.string().min(1, 'billingIdentityId is required'),
  priceId: z.string().min(1, 'priceId is required'),
  successUrl: z.string().min(1, 'successUrl is required'),
  cancelUrl: z.string().min(1, 'cancelUrl is required'),
  metadata: metadataSchema.optional(),
});

const checkoutSessionResponse = z.object({
  checkoutUrl: z.string().min(1),
  providerCheckoutSessionId: z.string().min(1),
});

const providerParams = z.object({
  provider: z.string().min(1),
});

const webhookResponse = z.object({
  providerEventId: z.string().min(1),
  eventType: z.string().min(1),
});

const ensureBillingIdentityInput = z.object({
  email: z.string().email().optional(),
  name: z.string().min(1).optional(),
  metadata: metadataSchema.optional(),
});

const ensureBillingIdentityResponse = z.object({
  billingIdentityId: z.string().min(1),
});

export type TBillingCheckoutSessionInput = z.infer<typeof checkoutSessionInput>;
export type TBillingCheckoutSessionResponse = z.infer<
  typeof checkoutSessionResponse
>;
export type TBillingProviderParams = z.infer<typeof providerParams>;
export type TBillingWebhookResponse = z.infer<typeof webhookResponse>;
export type TBillingEnsureIdentityInput = z.infer<
  typeof ensureBillingIdentityInput
>;
export type TBillingEnsureIdentityResponse = z.infer<
  typeof ensureBillingIdentityResponse
>;

export const billingDTO = Object.freeze({
  checkoutSessionInput,
  checkoutSessionResponse,
  providerParams,
  webhookResponse,
  ensureBillingIdentityInput,
  ensureBillingIdentityResponse,
});
