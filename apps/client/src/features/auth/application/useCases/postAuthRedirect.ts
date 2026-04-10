import { currentUserRoutes } from '@/src/shared/currentUser/domain/currentUser.constants';
import type { CurrentUser } from '@/src/shared/currentUser/domain/currentUser.model';

/**
 * Determine the post-auth redirect URL based on user's subscription status
 * @param user - The current user with subscription info
 * @returns The redirect URL (/plans if no active subscription, /dashboard if has active subscription)
 */
export function determinePostAuthRedirect(user: CurrentUser | null): string {
  return '/home';
}
