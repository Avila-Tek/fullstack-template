import type { TPurchaseResultTypeEnum } from './purchaseSubscription.constants';

/**
 * Purchase Subscription domain models
 * Frontend-friendly shapes for subscription purchase flow
 */

export interface SelectedPlan {
  id: string;
  key: string;
  name: string;
  isFree: boolean;
  price?: {
    id: string;
    amountCents: number;
    currency: string;
    interval: string;
  };
}

export interface PurchaseResult {
  success: boolean;
  type: TPurchaseResultTypeEnum;
  redirectUrl?: string;
}
