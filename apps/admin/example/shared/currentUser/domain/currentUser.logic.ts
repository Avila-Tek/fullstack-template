import { userSubscriptionStatusEnumObject } from './currentUser.constants';
import type { CurrentUser, UserSubscriptionStatus } from './currentUser.model';
import { subscriptionStatusEnumObject } from './currentUser.model';

/**
 * Get display name from user (firstName or email fallback)
 */
export function getDisplayName(
  firstName: string | null,
  email: string
): string {
  return firstName?.trim() ? firstName : email;
}

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

/**
 * Human-readable label for subscription status (UI display)
 */
export function getSubscriptionStatusLabel(
  status: UserSubscriptionStatus
): string {
  switch (status) {
    case userSubscriptionStatusEnumObject.no_subscription:
      return 'Sin plan';
    case userSubscriptionStatusEnumObject.active_free:
      return 'Plan gratuito';
    case userSubscriptionStatusEnumObject.active_paid:
      return 'Activo';
    case userSubscriptionStatusEnumObject.canceled:
      return 'Cancelado';
    case userSubscriptionStatusEnumObject.past_due:
      return 'Pago pendiente';
    default:
      return 'Sin plan';
  }
}
