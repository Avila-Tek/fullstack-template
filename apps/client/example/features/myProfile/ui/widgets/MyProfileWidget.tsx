'use client';

import { authStatusEnumObject } from '@/src/shared/currentUser/domain/currentUser.constants';
import { useUser } from '@/src/shared/currentUser/ui/hooks/useUser';
import { AccountCard } from '../components/AccountCard';
import { PlanCard } from '../components/PlanCard';

export function MyProfileWidget(): React.ReactElement | null {
  const { user, status, isLoading, subscriptionStatus, activePlan } = useUser();

  if (status === authStatusEnumObject.unauthenticated) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <div className="h-8 w-48 animate-pulse rounded bg-surface" />
      </div>
    );
  }

  const subscription = user?.subscription ?? null;

  return (
    <div className="mx-auto max-w-2xl space-y-6 px-4 py-8">
      <h1 className="text-2xl font-semibold txt-primary-900">Mi perfil</h1>
      <AccountCard />
      <PlanCard
        activePlan={activePlan}
        subscriptionStatus={subscriptionStatus}
        subscription={subscription}
      />
    </div>
  );
}
