import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/card';
import { Check } from 'lucide-react';
import type { SelectedPlan } from '../../domain/purchaseSubscription.model';

interface SubscriptionSummaryProps {
  plan: SelectedPlan;
}

export function SubscriptionSummary({ plan }: SubscriptionSummaryProps) {
  return (
    <Card className="border border-secondary bg-surface_alt">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg font-semibold">Selected Plan</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-base font-medium">{plan.name}</span>
          <Check className="h-5 w-5 text-green-500" />
        </div>

        {plan.isFree ? (
          <p className="text-sm txt-quaternary-500">Free Plan</p>
        ) : plan.price ? (
          <p className="text-sm txt-quaternary-500">
            ${(plan.price.amountCents / 100).toFixed(2)} {plan.price.currency} /{' '}
            {plan.price.interval}
          </p>
        ) : null}

        <p className="text-xs txt-tertiary-500">
          Plan Key: <span className="font-mono">{plan.key}</span>
        </p>
      </CardContent>
    </Card>
  );
}
