'use client';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
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
    <div className="container mx-auto max-w-md py-8 px-4">
      <Card className="border border-secondary bg-surface shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold text-center">
            Complete Your Subscription
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? <PlanDetailsLoader /> : null}

          {error ? <PlanDetailsError error={error} /> : null}

          {!isLoading && !error && plan ? (
            <SubscriptionForm plan={plan} />
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
