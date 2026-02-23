import { getPlanFeaturesForDisplay } from '@/src/shared/utils/planFeatures';
import { billingPeriodEnumObject, TBillingPeriod } from './viewPlans.constants';
import type { Plan, PlanPrice } from './viewPlans.model';

export interface PlanFeature {
  text: string;
  isEnabled: boolean;
}

export function getPlanFeatures(plan: Plan): PlanFeature[] {
  return [
    {
      text: plan.limits.habitsMax
        ? `Up to ${plan.limits.habitsMax} habits`
        : 'Unlimited habits',
      isEnabled: true,
    },
    {
      text: 'Detailed reports & analytics',
      isEnabled: plan.limits.reportsEnabled,
    },
    {
      text: plan.limits.historyDays
        ? `${plan.limits.historyDays} days history`
        : 'Unlimited history',
      isEnabled: true,
    },
    {
      text: 'Email reminders',
      isEnabled: plan.limits.remindersEnabled,
    },
  ];
}

/**
 * Get all possible features with their enabled status for a plan
 * This shows all features across all tiers, marking which are included
 */
export function getAllFeatures(plan: Plan): PlanFeature[] {
  return getPlanFeaturesForDisplay(plan.limits, plan.isFree);
}

export interface PlanPricing {
  monthlyPrice?: PlanPrice;
  yearlyPrice?: PlanPrice;
  fallbackPrice?: PlanPrice;
  selectedPrice?: PlanPrice;
  isFree: boolean;
  hasYearlyAndMonthly: boolean;
  originalYearlyCents: number;
  yearlySavingsCents: number;
  isActive?: boolean;
}

export function getPlanPricing(
  plan: Plan,
  billingPeriod: TBillingPeriod
): PlanPricing {
  const prices = plan.prices;
  const activePrices = prices.filter((price) => price.isActive !== false);
  const monthlyPrice = activePrices.find(
    (price) => price.interval === billingPeriodEnumObject.month
  );
  const yearlyPrice = activePrices.find(
    (price) => price.interval === billingPeriodEnumObject.year
  );
  const fallbackPrice = activePrices.find(
    (price) => price.interval === billingPeriodEnumObject.forever
  );
  const selectedPrice =
    billingPeriod === billingPeriodEnumObject.year
      ? (yearlyPrice ?? monthlyPrice)
      : monthlyPrice;

  const isFree =
    plan.isFree ||
    selectedPrice?.amountCents === 0 ||
    fallbackPrice?.amountCents === 0;

  const hasYearlyAndMonthly = Boolean(monthlyPrice && yearlyPrice);
  const originalYearlyCents = monthlyPrice ? monthlyPrice.amountCents * 12 : 0;
  const yearlySavingsCents =
    hasYearlyAndMonthly && yearlyPrice
      ? Math.max(0, originalYearlyCents - yearlyPrice.amountCents)
      : 0;

  return {
    monthlyPrice,
    yearlyPrice,
    fallbackPrice,
    selectedPrice,
    isFree,
    hasYearlyAndMonthly,
    originalYearlyCents,
    yearlySavingsCents,
  };
}
