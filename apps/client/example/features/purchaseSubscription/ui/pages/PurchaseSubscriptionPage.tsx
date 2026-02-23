'use client';

import { useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useGetPlanByIdQuery } from '../../application/queries/useGetPlanById.query';
import { purchaseSubscriptionSearchParamsEnumObject } from '../../domain/purchaseSubscription.constants';
import { PlanDetailsError } from '../components/PlanDetailsError';
import { PlanDetailsLoader } from '../components/PlanDetailsLoader';
import { SubscriptionForm } from '../widgets/SubscriptionForm';

export function PurchaseSubscriptionPage() {
  const searchParams = useSearchParams();
  const planId = searchParams.get(
    purchaseSubscriptionSearchParamsEnumObject.planId
  );

  const { data: plan, isLoading, error } = useGetPlanByIdQuery(planId);

  return (
    <div className="container mx-auto max-w-5xl px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-center txt-primary-900">
          Complete Your Subscription
        </h1>
      </div>

      {isLoading ? (
        <div className="flex justify-center">
          <PlanDetailsLoader />
        </div>
      ) : null}

      {error ? <PlanDetailsError error={error} /> : null}

      {!isLoading && !error && plan ? <SubscriptionForm plan={plan} /> : null}
    </div>
  );
}
