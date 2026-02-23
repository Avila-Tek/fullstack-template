import { userSubscriptionStatusEnumObject } from './currentUser.constants';
import type { CurrentUser, UserSubscriptionStatus } from './currentUser.model';
import { subscriptionStatusEnumObject } from './currentUser.model';

/**
 * Check if user has an active subscription
 */
export function hasActiveSubscription(
  user: CurrentUser | null | undefined
): boolean {
  if (!user?.subscription) {
    return false;
  }
  return (
    user.subscription.status === subscriptionStatusEnumObject.active ||
    user.subscription.status === subscriptionStatusEnumObject.trialing
  );
}

/**
 * Get detailed subscription status for UI decisions
 */
export function getUserSubscriptionStatus(
  user: CurrentUser | null | undefined
): UserSubscriptionStatus {
  if (!user?.subscription) {
    return userSubscriptionStatusEnumObject.no_subscription;
  }

  const { status, isFree } = user.subscription;

  if (
    status === subscriptionStatusEnumObject.active ||
    status === subscriptionStatusEnumObject.trialing
  ) {
    return isFree
      ? userSubscriptionStatusEnumObject.active_free
      : userSubscriptionStatusEnumObject.active_paid;
  }

  if (status === subscriptionStatusEnumObject.canceled) {
    return userSubscriptionStatusEnumObject.canceled;
  }

  if (
    status === subscriptionStatusEnumObject.past_due ||
    status === subscriptionStatusEnumObject.unpaid
  ) {
    return userSubscriptionStatusEnumObject.past_due;
  }

  return userSubscriptionStatusEnumObject.no_subscription;
}

/**
 * Check if user needs to select a plan
 * Used for post-auth redirect logic
 */
export function needsPlanSelection(
  user: CurrentUser | null | undefined
): boolean {
  return !hasActiveSubscription(user);
}
