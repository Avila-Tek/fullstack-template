import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Receipt } from 'lucide-react';
import * as React from 'react';
import {
  formatBillingCycleLabel,
  formatInterval,
  formatPrice,
} from '@/src/shared/utils/formatters';
import type { SelectedPlan } from '../../domain/purchaseSubscription.model';

interface OrderSummaryProps {
  plan: SelectedPlan;
}

export function OrderSummary({ plan }: OrderSummaryProps): React.ReactElement {
  const priceDisplay = plan.isFree
    ? 'Gratis'
    : plan.price
      ? `${formatPrice(plan.price.amountCents, plan.price.currency)}${formatInterval(plan.price.interval)}`
      : '';

  const billingCycle = plan.price?.interval
    ? formatBillingCycleLabel(plan.price.interval)
    : null;

  return (
    <Card className="rounded-2xl border border-secondary bg-surface shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 txt-primary-900">
          <Receipt className="h-5 w-5 txt-brand-600" />
          Order Summary
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium txt-primary-900">{plan.name}</p>
              {billingCycle ? (
                <p className="text-sm txt-quaternary-500">
                  Billed {billingCycle.toLowerCase()}
                </p>
              ) : null}
            </div>
            <p className="text-lg font-semibold txt-primary-900">
              {priceDisplay}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-4">
          <div className="flex justify-between items-center">
            <span className="font-semibold txt-primary-900">Total</span>
            <span className="text-xl font-bold txt-primary-900">
              {priceDisplay}
            </span>
          </div>
        </div>

        <div className="pt-2">
          <p className="text-xs txt-quaternary-500">
            Your subscription will start immediately after payment confirmation.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
