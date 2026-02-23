import type { TPurchaseResultTypeEnum } from './purchaseSubscription.constants';

/**
 * Purchase Subscription domain models
 * Frontend-friendly shapes for subscription purchase flow
 */

export interface SelectedPlanLimits {
  habitsMax: number | null;
  reportsEnabled: boolean;
  historyDays: number | null;
  remindersEnabled: boolean;
}

export interface SelectedPlan {
  id: string;
  key: string;
  name: string;
  isFree: boolean;
  limits?: SelectedPlanLimits;
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
