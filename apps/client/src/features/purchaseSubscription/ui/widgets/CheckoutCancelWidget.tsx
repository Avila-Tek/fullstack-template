'use client';

import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useHandleCheckoutCancel } from '../../application/useCases/handleCheckoutCancel.useCase';
import { checkoutQueryParams } from '../../domain/checkout.constants';
import { CheckoutCancelMessage } from '../components/CheckoutCancelMessage';

export function CheckoutCancelWidget(): React.ReactElement {
  const searchParams = useSearchParams();
  const planId = searchParams.get(checkoutQueryParams.planId);
  const { goBackToPlans, tryAgain } = useHandleCheckoutCancel();

  const handleTryAgain = () => {
    if (planId) {
      tryAgain(planId);
    } else {
      goBackToPlans();
    }
  };

  return (
    <Card className="border border-secondary bg-surface shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-semibold text-center text-amber-600">
          Payment Cancelled
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <CheckoutCancelMessage />

        <div className="flex flex-col gap-3 pt-4">
          <Button onClick={handleTryAgain} className="w-full">
            Try Again
          </Button>

          <Button onClick={goBackToPlans} variant="outline" className="w-full">
            Back to Plans
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
