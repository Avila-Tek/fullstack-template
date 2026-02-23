import { Button } from '@repo/ui/components/button';
import React from 'react';
import { formatInterval, formatPrice } from '@/src/shared/utils/formatters';
import {
  billingPeriodEnumObject,
  TBillingPeriod,
} from '../../domain/viewPlans.constants';
import { getPlanPricing } from '../../domain/viewPlans.logic';
import type { Plan } from '../../domain/viewPlans.model';
import FeaturesList from './FeaturesList';
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

  return (
    <div
      className={`relative rounded-2xl bg-surface transition-all ${
        isFeatured
          ? 'border-2 border-brand-500 shadow-lg scale-105 z-10'
          : 'border border-gray-200 shadow-sm hover:shadow-md'
      } ${isSelected ? 'ring-2 ring-primary' : ''}`}
    >
      <div className="p-6 space-y-6">
        {/* Plan Name */}
        <div>
          <h3 className="text-xl font-semibold txt-primary-900">{plan.name}</h3>
        </div>

        {/* Price Section */}
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            <span className="text-3xl font-bold txt-primary-900">
              {priceDisplay}
            </span>
            {billingPeriod === billingPeriodEnumObject.year &&
            monthlyPrice &&
            yearlyPrice ? (
              <span className="text-md txt-quaternary-400 line-through">
                {formatPrice(originalYearlyCents, yearlyPrice.currency)}/año
              </span>
            ) : null}
          </div>
          <SavingsBadge
            isFree={isFree}
            billingPeriod={billingPeriod}
            yearlySavingsCents={yearlySavingsCents}
            yearlyPrice={yearlyPrice}
            monthlyPrice={monthlyPrice}
          />
        </div>

        {/* CTA Button */}
        <Button
          className="w-full"
          variant={isFeatured ? 'cta' : 'cta_outline'}
          onClick={() => onSelect(plan)}
        >
          {isFree ? 'Continuar Gratis' : 'Elegir Plan'}
        </Button>

        {/* Divider */}
        <div className="border-t border-gray-200" />

        {/* Features List */}
        <FeaturesList plan={plan} />
      </div>
    </div>
  );
}
