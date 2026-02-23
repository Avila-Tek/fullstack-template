'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import {
  checkoutQueryParams,
  checkoutRoutes,
} from '../../domain/checkout.constants';

type HandleCheckoutCancelResult = {
  goBackToPlans: () => void;
  tryAgain: (planId: string) => void;
};

export function useHandleCheckoutCancel(): HandleCheckoutCancelResult {
  const router = useRouter();

  const goBackToPlans = React.useCallback(() => {
    router.push(checkoutRoutes.plans);
  }, [router]);

  const tryAgain = React.useCallback(
    (planId: string) => {
      router.push(
        `${checkoutRoutes.success}?${checkoutQueryParams.planId}=${planId}`
      );
    },
    [router]
  );

  return {
    goBackToPlans,
    tryAgain,
  };
}
