'use client';

import { useRouter } from 'next/navigation';
import React from 'react';
import { usePlansCatalogQuery } from '../../application/queries/usePlansCatalog.query';
import { useSelectPlan } from '../../application/useCases/selectPlan.useCase';
import {
  billingPeriodEnumObject,
  TBillingPeriod,
} from '../../domain/viewPlans.constants';
import type { Plan } from '../../domain/viewPlans.model';
import { BillingPeriodToggle } from '../components/BillingPeriodToggle';
import { PlansEmpty } from '../components/PlansEmpty';
import { PlansError } from '../components/PlansError';
import { PlansLoading } from '../components/PlansLoading';
import { PlansGrid } from './PlansGrid';

export function PlanSelector(): React.ReactElement {
  const [selectedPlanId, setSelectedPlanId] = React.useState<string | null>(
    null
  );
  const [billingPeriod, setBillingPeriod] = React.useState<TBillingPeriod>(
    billingPeriodEnumObject.month
  );
  const router = useRouter();
  const { data: plans, isLoading, error, refetch } = usePlansCatalogQuery();
  const { select } = useSelectPlan(router.push);

  const handleSelectPlan = React.useCallback(
    async (plan: Plan) => {
      setSelectedPlanId(plan.id);
      select(plan);
    },
    [select]
  );

  if (isLoading) {
    return <PlansLoading />;
  }

  if (error) {
    return <PlansError error={error} onRetry={() => refetch()} />;
  }

  if (!plans || plans.length === 0) {
    return <PlansEmpty />;
  }

  return (
    <div className="space-y-8">
      <div className="text-center space-y-6">
        <h1 className="text-4xl font-bold txt-primary-900">
          Planes para cualquier necesidad
        </h1>
        <BillingPeriodToggle
          value={billingPeriod}
          onChange={setBillingPeriod}
        />
      </div>

      <PlansGrid
        plans={plans}
        selectedPlanId={selectedPlanId}
        onSelectPlan={handleSelectPlan}
        billingPeriod={billingPeriod}
      />
    </div>
  );
}
