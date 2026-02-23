import React from 'react';
import { TBillingPeriod } from '../../domain/viewPlans.constants';
import type { Plan } from '../../domain/viewPlans.model';
import { PlanCard } from '../components/PlanCard';

interface PlansGridProps {
  plans: Plan[];
  selectedPlanId: string | null;
  onSelectPlan: (plan: Plan) => void;
  billingPeriod: TBillingPeriod;
}

export function PlansGrid({
  plans,
  selectedPlanId,
  onSelectPlan,
  billingPeriod,
}: PlansGridProps): React.ReactElement {
  // Sort plans by display order and identify the middle plan
  const sortedPlans = [...plans].sort(
    (a, b) => a.displayOrder - b.displayOrder
  );
  const featuredPlanIndex = Math.floor(sortedPlans.length / 2);

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 items-start">
      {sortedPlans.map((plan, index) => (
        <PlanCard
          key={plan.id}
          plan={plan}
          isSelected={plan.id === selectedPlanId}
          onSelect={onSelectPlan}
          isFeatured={index === featuredPlanIndex}
          billingPeriod={billingPeriod}
        />
      ))}
    </div>
  );
}
