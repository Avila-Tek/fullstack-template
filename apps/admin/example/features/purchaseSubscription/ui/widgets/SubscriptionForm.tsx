'use client';

import { Button } from '@repo/ui/components/button';
import { Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useUser } from '@/src/shared/currentUser/ui/hooks/useUser';
import { routeBuilders } from '@/src/shared/routes/routes';
import { PlanCard } from '@/src/shared/ui/components/PlanCard';
import { formatInterval, formatPrice } from '@/src/shared/utils/formatters';
import { getPlanFeaturesForDisplay } from '@/src/shared/utils/planFeatures';
import { usePurchaseSubscription } from '../../application/useCases/purchaseSubscription.useCase';
import { purchaseResultTypeEnumObject } from '../../domain/purchaseSubscription.constants';
import type { SelectedPlan } from '../../domain/purchaseSubscription.model';
import { LegalLinks } from '../components/LegalLinks';
import { OrderSummary } from '../components/OrderSummary';

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

    const successUrl = `${window.location.origin}${routeBuilders.subscribeSuccess()}`;
    const cancelUrl = `${window.location.origin}${routeBuilders.subscribeCancel()}?planId=${plan.id}`;

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
        router.push(routeBuilders.dashboard());
      } else if (
        purchaseResult.type === purchaseResultTypeEnumObject.checkout &&
        purchaseResult.redirectUrl
      ) {
        // Paid plan: redirect to Stripe checkout
        window.location.href = purchaseResult.redirectUrl;
      }
    }
  }

  const buttonLabel = plan.isFree
    ? 'Start Free Plan'
    : 'Continue to Stripe Checkout';

  const priceDisplay = plan.isFree
    ? 'Gratis'
    : plan.price
      ? `${formatPrice(plan.price.amountCents, plan.price.currency)}${formatInterval(plan.price.interval)}`
      : '';

  return (
    <div className="grid md:grid-cols-2 gap-6">
      {/* Left Column: Plan Details */}
      <div className="md:grid-cols-1">
        <PlanCard
          title="Selected Plan"
          name={plan.name}
          priceDisplay={priceDisplay}
          features={getPlanFeaturesForDisplay(
            plan.limits ?? undefined,
            plan.isFree
          )}
          isSelected
        />
      </div>

      {/* Right Column: Checkout Sidebar (Sticky) */}
      <div className="md:col-span-1">
        <div className="md:sticky md:top-4 space-y-4">
          <OrderSummary plan={plan} />

          <Button
            variant={plan.isFree ? 'cta_outline' : 'cta'}
            onClick={handleSubscribe}
            disabled={purchaseSubscription.isPending}
            className="w-full"
          >
            {purchaseSubscription.isPending ? (
              'Processing...'
            ) : plan.isFree ? (
              buttonLabel
            ) : (
              <React.Fragment>
                <Lock className="h-4 w-4" />
                {buttonLabel}
              </React.Fragment>
            )}
          </Button>

          <LegalLinks />

          {purchaseSubscription.error ? (
            <p className="text-sm text-destructive">
              {purchaseSubscription.error.message}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
