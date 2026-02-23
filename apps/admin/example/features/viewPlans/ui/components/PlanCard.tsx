import React from 'react';
import { PlanCard as SharedPlanCard } from '@/src/shared/ui/components/PlanCard';
import { formatInterval, formatPrice } from '@/src/shared/utils/formatters';
import {
  billingPeriodEnumObject,
  TBillingPeriod,
} from '../../domain/viewPlans.constants';
import { getAllFeatures, getPlanPricing } from '../../domain/viewPlans.logic';
import type { Plan } from '../../domain/viewPlans.model';
import { SavingsBadge } from './SavingsBadge';

interface PlanCardProps {
  plan: Plan;
  isSelected?: boolean;
  isFeatured?: boolean;
  billingPeriod: TBillingPeriod;
  onSelect: (plan: Plan) => void;
}

export function PlanCard({
  plan,
  isSelected = false,
  isFeatured = false,
  billingPeriod,
  onSelect,
}: PlanCardProps): React.ReactElement {
  const {
    monthlyPrice,
    yearlyPrice,
    selectedPrice,
    isFree,
    originalYearlyCents,
    yearlySavingsCents,
  } = getPlanPricing(plan, billingPeriod);

  const priceDisplay = selectedPrice
    ? selectedPrice.amountCents === 0
      ? 'Gratis'
      : `${formatPrice(
          selectedPrice.amountCents,
          selectedPrice.currency
        )}${formatInterval(selectedPrice.interval)}`
    : isFree
      ? 'Gratis'
      : '';

  const secondaryPriceDisplay =
    billingPeriod === billingPeriodEnumObject.year &&
    monthlyPrice &&
    yearlyPrice
      ? `${formatPrice(originalYearlyCents, yearlyPrice.currency)}/año`
      : undefined;

  return (
    <SharedPlanCard
      name={plan.name}
      priceDisplay={priceDisplay}
      secondaryPriceDisplay={secondaryPriceDisplay}
      features={getAllFeatures(plan)}
      savingsBadge={
        <SavingsBadge
          isFree={isFree}
          billingPeriod={billingPeriod}
          yearlySavingsCents={yearlySavingsCents}
          yearlyPrice={yearlyPrice}
          monthlyPrice={monthlyPrice}
        />
      }
      onSelect={() => onSelect(plan)}
      isFree={isFree}
      isFeatured={isFeatured}
      isSelected={isSelected}
    />
  );
}
