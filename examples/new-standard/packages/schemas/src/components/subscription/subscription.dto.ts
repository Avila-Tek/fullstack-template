import { getEnumObjectFromArray } from '@repo/utils';
import { z } from 'zod';
import { planDTO } from '../plan/plan.dto';

// Subscription status values
export const subscriptionStatus = [
  'active',
  'canceled',
  'past_due',
  'unpaid',
  'incomplete',
  'incomplete_expired',
  'trialing',
] as const;
export type TSubscriptionStatusEnum = (typeof subscriptionStatus)[number];
export const subscriptionStatusEnumObject =
  getEnumObjectFromArray(subscriptionStatus);

// Subscription response type values
export const subscriptionResponseType = [
  'free_subscription_created',
  'checkout_redirect',
] as const;
export type TSubscriptionResponseTypeEnum =
  (typeof subscriptionResponseType)[number];
export const subscriptionResponseTypeEnumObject = getEnumObjectFromArray(
  subscriptionResponseType
);

// Plan in subscription context (simplified from plan.dto)
const subscriptionPlanSchema = z.object({
  id: z.string().uuid(),
  key: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  isFree: z.boolean(),
  limits: planDTO.planLimitsSchema,
});

// Price in subscription context (simplified from plan.dto)
const subscriptionPriceSchema = z.object({
  id: z.string().uuid(),
  currency: z.string(),
  interval: z.string(),
  amountCents: z.number().int(),
});

// Full subscription schema
const subscriptionSchema = z.object({
  id: z.string().uuid(),
  userId: z.string().uuid(),
  status: z.string(),
  isFree: z.boolean(),
  currentPeriodStart: z.coerce.date().nullable(),
  currentPeriodEnd: z.coerce.date().nullable(),
  cancelAtPeriodEnd: z.boolean(),
  canceledAt: z.coerce.date().nullable(),
  plan: subscriptionPlanSchema,
  price: subscriptionPriceSchema,
  createdAt: z.coerce.date(),
  updatedAt: z.coerce.date(),
});

// Subscribe input
const subscribeInput = z.object({
  planId: z.string().uuid(),
  planPriceId: z.string().uuid(),
  successUrl: z.string().url().optional(),
  cancelUrl: z.string().url().optional(),
});

// Subscribe response - discriminated union for free vs paid
const subscribeResponse = z.discriminatedUnion('type', [
  z.object({
    type: z.literal(
      subscriptionResponseTypeEnumObject.free_subscription_created
    ),
    subscriptionId: z.string().uuid(),
  }),
  z.object({
    type: z.literal(subscriptionResponseTypeEnumObject.checkout_redirect),
    checkoutUrl: z.string().url(),
    checkoutSessionId: z.string(),
  }),
]);

// Current subscription response
const currentSubscriptionResponse = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: subscriptionSchema,
  }),
  z.object({
    success: z.literal(false),
    error: z.string(),
  }),
]);

// Type exports
export type TSubscription = z.infer<typeof subscriptionSchema>;
export type TSubscriptionPlan = z.infer<typeof subscriptionPlanSchema>;
export type TSubscriptionPrice = z.infer<typeof subscriptionPriceSchema>;
export type TSubscribeInput = z.infer<typeof subscribeInput>;
export type TSubscribeResponse = z.infer<typeof subscribeResponse>;
export type TCurrentSubscriptionResponse = z.infer<
  typeof currentSubscriptionResponse
>;

export const subscriptionDTO = Object.freeze({
  subscriptionSchema,
  subscriptionPlanSchema,
  subscriptionPriceSchema,
  subscribeInput,
  subscribeResponse,
  currentSubscriptionResponse,
});
