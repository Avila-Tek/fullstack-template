import { TBillingPeriod } from './viewPlans.constants';
/**
 * View Plans domain models
 * Frontend-friendly shapes aligned with backend schema
 */

// Plan limits structure
export interface PlanLimits {
  habitsMax: number | null;
  reportsEnabled: boolean;
  historyDays: number | null;
  remindersEnabled: boolean;
}

// Plan price model
// TODO interval should be an enum, make changes in back
export interface PlanPrice {
  id: string;
  currency: string;
  interval: TBillingPeriod;
  amountCents: number;
  trialDays: number;
  isActive: boolean;
}

// Main plan model for catalog display
export interface Plan {
  id: string;
  key: string;
  name: string;
  description: string | null;
  isFree: boolean;
  displayOrder: number;
  limits: PlanLimits;
  prices: PlanPrice[];
}

// Result of plan selection
export interface SelectPlanResult {
  plan: Plan;
  requiresPayment: boolean;
  redirectUrl: string | null;
}
