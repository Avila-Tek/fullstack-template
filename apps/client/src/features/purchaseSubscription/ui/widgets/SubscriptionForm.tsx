'use client';

import { Button } from '@repo/ui/components/button';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useUser } from '@/src/shared/hooks/useUser';
import { usePurchaseSubscription } from '../../application/useCases/purchaseSubscription.useCase';
import { checkoutRoutes } from '../../domain/checkout.constants';
import { purchaseResultTypeEnumObject } from '../../domain/purchaseSubscription.constants';
import type { SelectedPlan } from '../../domain/purchaseSubscription.model';
import { CheckoutPlaceholder } from '../components/CheckoutPlaceholder';
import { SubscriptionSummary } from '../components/SubscriptionSummary';

interface SubscriptionFormProps {
  plan: SelectedPlan;
}

export function SubscriptionForm({ plan }: SubscriptionFormProps) {
  const router = useRouter();
  const purchaseSubscription = usePurchaseSubscription();
  const { refetchUser } = useUser();

  async function handleSubscribe() {
    if (purchaseSubscription.isPending) {
      return;
    }

    const successUrl = `${window.location.origin}${checkoutRoutes.success}`;
    const cancelUrl = `${window.location.origin}${checkoutRoutes.cancel}?planId=${plan.id}`;

    const result = await purchaseSubscription.mutateAsync({
      planId: plan.id,
      planPriceId: plan.price?.id || plan.id,
      successUrl,
      cancelUrl,
    });

    if (result.success && result.result) {
      const { result: purchaseResult } = result;

      if (purchaseResult.type === purchaseResultTypeEnumObject.free) {
        // Free plan: refresh user data and redirect to dashboard
        await refetchUser();
        router.push(checkoutRoutes.dashboard);
      } else if (
        purchaseResult.type === purchaseResultTypeEnumObject.checkout &&
        purchaseResult.redirectUrl
      ) {
        // Paid plan: redirect to Stripe checkout
        window.location.href = purchaseResult.redirectUrl;
      }
    }
  }

  return (
    <div className="space-y-6">
      <SubscriptionSummary plan={plan} />

      <CheckoutPlaceholder />

      <Button
        onClick={handleSubscribe}
        disabled={purchaseSubscription.isPending}
        className="w-full"
      >
        {purchaseSubscription.isPending
          ? 'Processing...'
          : plan.isFree
            ? 'Start Free Plan'
            : 'Continue to Checkout'}
      </Button>

      {purchaseSubscription.error ? (
        <p className="text-sm text-red-500">
          {purchaseSubscription.error.message}
        </p>
      ) : null}
    </div>
  );
}
