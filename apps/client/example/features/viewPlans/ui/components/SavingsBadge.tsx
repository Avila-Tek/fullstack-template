import { Badge } from '@repo/ui/components/badge';
import React from 'react';
import { formatPrice } from '@/src/shared/utils/formatters';
import {
  billingPeriodEnumObject,
  TBillingPeriod,
} from '../../domain/viewPlans.constants';
import type { PlanPrice } from '../../domain/viewPlans.model';

interface SavingsBadgeProps {
  isFree: boolean;
  billingPeriod: TBillingPeriod;
  yearlySavingsCents: number;
  yearlyPrice?: PlanPrice;
  monthlyPrice?: PlanPrice;
}

export function SavingsBadge({
  isFree,
  billingPeriod,
  yearlySavingsCents,
  yearlyPrice,
  monthlyPrice,
}: SavingsBadgeProps): React.ReactElement | null {
  if (
    isFree ||
    billingPeriod !== billingPeriodEnumObject.year ||
    yearlySavingsCents <= 0
  ) {
    return null;
  }

  const currency = yearlyPrice?.currency ?? monthlyPrice?.currency ?? 'usd';

  return (
    <Badge variant={'cta'}>
      Ahorra {formatPrice(yearlySavingsCents, currency)} al año
    </Badge>
  );
}
