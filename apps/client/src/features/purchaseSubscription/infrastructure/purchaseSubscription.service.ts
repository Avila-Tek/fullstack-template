import type { TSubscribeInput } from '@repo/schemas';
import type {
  PurchaseResult,
  SelectedPlan,
} from '../domain/purchaseSubscription.model';
import type {
  PlansApi,
  SubscriptionsApi,
} from './purchaseSubscription.interfaces';
import {
  toPurchaseResultDomain,
  toSelectedPlanDomain,
} from './purchaseSubscription.transform';

export class PurchaseSubscriptionServiceClass {
  constructor(
    private plansApi: PlansApi,
    private subscriptionsApi: SubscriptionsApi
  ) {}

  async getPlanById(planId: string): Promise<SelectedPlan> {
    const result = await this.plansApi.getPlanById(planId);

    if (!result.success) {
      throw new Error(result.error || 'Error fetching plan');
    }

    return toSelectedPlanDomain(result.data);
  }

  async subscribe(input: TSubscribeInput): Promise<PurchaseResult> {
    const result = await this.subscriptionsApi.subscribe(input);

    if (!result.success) {
      throw new Error(result.error || 'Error processing subscription');
    }

    return toPurchaseResultDomain(result.data);
  }
}
