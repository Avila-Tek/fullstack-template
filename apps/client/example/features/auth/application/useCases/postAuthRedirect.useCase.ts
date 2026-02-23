import { hasActiveSubscription } from '@/src/shared/currentUser/domain/currentUser.logic';
import type { CurrentUser } from '@/src/shared/currentUser/domain/currentUser.model';
import { routeBuilders } from '@/src/shared/routes/routes';

/**
 * Determine the post-auth redirect URL based on user's subscription status
 * @param user - The current user with subscription info
 * @returns The redirect URL (/plans if no active subscription, /dashboard if has active subscription)
 */
export function determinePostAuthRedirect(user: CurrentUser | null): string {
  if (hasActiveSubscription(user)) {
    return routeBuilders.dashboard();
  }
  return routeBuilders.plans();
}
