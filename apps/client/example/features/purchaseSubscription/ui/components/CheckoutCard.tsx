import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { CreditCard, Lock } from 'lucide-react';
import React from 'react';
import type { SelectedPlan } from '../../domain/purchaseSubscription.model';

interface CheckoutCardProps {
  plan: SelectedPlan;
}

export function CheckoutCard({ plan }: CheckoutCardProps) {
  const isPaid = !plan.isFree;

  return (
    <Card className="rounded-2xl border border-secondary bg-surface shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold flex items-center gap-2 txt-primary-900">
          <CreditCard className="h-5 w-5 txt-brand-600" />
          Checkout
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isPaid ? (
          <React.Fragment>
            <p className="text-sm txt-secondary-700">
              You'll complete payment securely with Stripe. Your subscription
              will start as soon as payment is confirmed.
            </p>
            <div className="flex items-center gap-2 text-xs txt-quaternary-500">
              <Lock className="h-3.5 w-3.5 shrink-0" />
              <span>Secure checkout · No card stored on our servers</span>
            </div>
          </React.Fragment>
        ) : (
          <p className="text-sm txt-secondary-700">
            No payment required. Your free plan will activate immediately.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
