import { getAPIClient } from '@/src/lib/api';
import { PurchaseSubscriptionServiceClass } from './purchaseSubscription.service';

/**
 * Default service instance using the real API client.
 * For testing, instantiate PurchaseSubscriptionServiceClass with mock APIs.
 */
const api = getAPIClient();
export const PurchaseSubscriptionService = new PurchaseSubscriptionServiceClass(
  api.v1.plans,
  api.v1.subscriptions
);
