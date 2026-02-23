import { getEnumObjectFromArray } from '@repo/utils';

/**
 * Current User domain models
 * Frontend-friendly shapes aligned with backend schema
 */

// Subscription status from backend
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

// Plan limits structure
export interface PlanLimits {
  habitsMax: number | null;
  reportsEnabled: boolean;
  historyDays: number | null;
  remindersEnabled: boolean;
}

// Plan info in subscription context
export interface SubscriptionPlan {
  id: string;
  key: string;
  name: string;
  isFree: boolean;
  limits: PlanLimits;
}

// Price info in subscription context
export interface SubscriptionPrice {
  id: string;
  currency: string;
  interval: string;
  amountCents: number;
}

// Full subscription model
export interface Subscription {
  id: string;
  status: TSubscriptionStatusEnum;
  isFree: boolean;
  currentPeriodStart: Date | null;
  currentPeriodEnd: Date | null;
  cancelAtPeriodEnd: boolean;
  plan: SubscriptionPlan;
  price: SubscriptionPrice;
}

// Current user with subscription
export interface CurrentUser {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  timezone: string;
  status: string;
  subscription: Subscription | null;
  createdAt: Date;
  updatedAt: Date;
}

// User subscription status for UI decisions
export type UserSubscriptionStatus =
  | 'no_subscription'
  | 'active_free'
  | 'active_paid'
  | 'canceled'
  | 'past_due';

/**
 * User session model
 * Represents the authenticated session for the current user
 */
export interface UserSession {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    timezone: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
  accessToken: string;
  refreshToken: string;
}
