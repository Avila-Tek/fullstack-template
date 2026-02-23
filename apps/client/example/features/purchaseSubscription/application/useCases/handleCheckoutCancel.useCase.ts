'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { routeBuilders } from '@/src/shared/routes/routes';

type HandleCheckoutCancelResult = {
  goBackToPlans: () => void;
  tryAgain: (planId: string) => void;
};

export function useHandleCheckoutCancel(): HandleCheckoutCancelResult {
  const router = useRouter();

  const goBackToPlans = React.useCallback(() => {
    router.push(routeBuilders.plans());
  }, [router]);

  const tryAgain = React.useCallback(
    (planId: string) => {
      router.push(routeBuilders.subscribe({ planId }));
    },
    [router]
  );

  return {
    goBackToPlans,
    tryAgain,
  };
}
