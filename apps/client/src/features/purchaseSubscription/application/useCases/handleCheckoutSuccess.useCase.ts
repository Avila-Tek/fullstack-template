'use client';

import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useUser } from '@/src/shared/hooks/useUser';
import type { TCheckoutStatusEnum } from '../../domain/checkout.constants';
import {
  checkoutRoutes,
  checkoutStatusEnumObject,
} from '../../domain/checkout.constants';

type CheckoutSuccessState = {
  status: TCheckoutStatusEnum;
  error: Error | null;
};

type HandleCheckoutSuccessResult = {
  isLoading: boolean;
  isSuccess: boolean;
  error: Error | null;
  handleSuccess: (sessionId: string) => Promise<void>;
  reset: () => void;
};

export function useHandleCheckoutSuccess(): HandleCheckoutSuccessResult {
  const router = useRouter();
  const { refetchUser } = useUser();
  const [state, setState] = React.useState<CheckoutSuccessState>({
    status: checkoutStatusEnumObject.loading,
    error: null,
  });

  const handleSuccess = React.useCallback(
    async (sessionId: string) => {
      setState({ status: checkoutStatusEnumObject.loading, error: null });

      try {
        await refetchUser();

        setState({ status: checkoutStatusEnumObject.success, error: null });
      } catch (error) {
        setState({
          status: checkoutStatusEnumObject.error,
          error:
            error instanceof Error
              ? error
              : new Error('Failed to activate subscription'),
        });
      }
    },
    [refetchUser]
  );

  const reset = React.useCallback(() => {
    setState({ status: checkoutStatusEnumObject.loading, error: null });
    router.push(checkoutRoutes.plans);
  }, []);

  const isLoading = state.status === checkoutStatusEnumObject.loading;
  const isSuccess = state.status === checkoutStatusEnumObject.success;

  return {
    isLoading,
    isSuccess,
    error: state.error,
    handleSuccess,
    reset,
  };
}
