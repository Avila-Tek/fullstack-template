'use client';

import { Button } from '@repo/ui/components/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { XCircle } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useHandleCheckoutCancel } from '../../application/useCases/handleCheckoutCancel.useCase';
import { checkoutQueryParams } from '../../domain/checkout.constants';

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
    <Card className="border border-secondary bg-surface">
      <CardHeader className="pb-4">
        <div className="flex flex-col items-center space-y-3">
          <div className="rounded-full bg-warning-600/10 p-3">
            <XCircle className="h-10 w-10 txt-warning-primary-600" />
          </div>
          <CardTitle className="text-xl font-semibold text-center">
            Checkout Cancelled
          </CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <CardDescription className="text-center text-base txt-tertiary-600">
          You cancelled the checkout process. No charges were made to your
          account.
        </CardDescription>

        <div className="flex flex-col gap-3">
          <Button onClick={handleTryAgain} variant="cta" className="w-full">
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
