'use client';

import { Badge } from '@repo/ui/components/badge';
import { LinkButton } from '@repo/ui/components/button';
import * as React from 'react';
import { getSubscriptionStatusLabel } from '@/src/shared/currentUser/domain/currentUser.logic';
import type {
  Subscription,
  SubscriptionPlan,
  UserSubscriptionStatus,
} from '@/src/shared/currentUser/domain/currentUser.model';
import { routeBuilders } from '@/src/shared/routes/routes';
import { PlanCard as SharedPlanCard } from '@/src/shared/ui/components/PlanCard';
import { formatDateMedium } from '@/src/shared/utils/date.utils';
import { formatInterval, formatPrice } from '@/src/shared/utils/formatters';
import { getPlanFeaturesForDisplay } from '@/src/shared/utils/planFeatures';

interface PlanCardProps {
  activePlan: SubscriptionPlan | null;
  subscriptionStatus: UserSubscriptionStatus;
  subscription: Subscription | null;
}

export function PlanCard({
  activePlan,
  subscriptionStatus,
  subscription,
}: PlanCardProps): React.ReactElement {
  const statusLabel = getSubscriptionStatusLabel(subscriptionStatus);
  const planName = activePlan?.name ?? 'Sin plan activo';
  const isFree = activePlan?.isFree ?? true;
  const periodEnd = subscription?.currentPeriodEnd ?? null;
  const price = subscription?.price;

  const priceDisplay = isFree
    ? 'Gratis'
    : price
      ? `${formatPrice(price.amountCents, price.currency)}${formatInterval(price.interval)}`
      : 'Gratis';

  const features = getPlanFeaturesForDisplay(
    activePlan?.limits ?? null,
    isFree
  );

  const footer = (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={'cta'}>{statusLabel}</Badge>
        {activePlan ? (
          <Badge variant={'cta'}>{isFree ? 'Gratuito' : 'De pago'}</Badge>
        ) : null}
      </div>
      {periodEnd ? (
        <p className="text-sm txt-quaternary-500">
          Renovación: {formatDateMedium(periodEnd)}
        </p>
      ) : null}
      <LinkButton
        href={routeBuilders.plans()}
        className="w-full"
        variant="outline"
      >
        Ver planes
      </LinkButton>
    </div>
  );

  return (
    <SharedPlanCard
      title="Tu plan"
      name={planName}
      priceDisplay={priceDisplay}
      features={features}
      isSelected
      isFree={isFree}
      footer={footer}
    />
  );
}
