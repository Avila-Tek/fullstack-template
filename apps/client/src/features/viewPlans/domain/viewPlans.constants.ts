import { getEnumObjectFromArray } from '@repo/utils';

/**
 * View Plans constants - object enums
 * Following the auth feature pattern
 */

// Query keys for React Query
export const viewPlansQueryKey = ['plansCatalog'] as const;
export type TViewPlansQueryKey = (typeof viewPlansQueryKey)[number];
export const viewPlansQueryKeyEnumObject =
  getEnumObjectFromArray(viewPlansQueryKey);

// Routes
export const viewPlansRoutes = {
  plans: '/plans',
  checkout: '/subscribe',
  dashboard: '/dashboard',
} as const;

// Plan key constants
export const planKeys = ['FREE', 'PRO', 'ENTERPRISE'] as const;
export type TPlanKeyEnum = (typeof planKeys)[number];
export const planKeyEnumObject = getEnumObjectFromArray(planKeys);

export const billingPeriod = ['month', 'year', 'forever'] as const;
export type TBillingPeriod = (typeof billingPeriod)[number];
export const billingPeriodEnumObject = getEnumObjectFromArray(billingPeriod);

export const billingPeriodToggleOptions = [
  billingPeriodEnumObject.month,
  billingPeriodEnumObject.year,
] as const;

export const billingPeriodEsLabelMap: Record<TBillingPeriod, string> = {
  month: 'Mensual',
  year: 'Anual',
  forever: 'Para siempre',
};
