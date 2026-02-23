'use client';

import { useSearchParams } from 'next/navigation';
import * as React from 'react';
import { useHandleCheckoutSuccess } from '../../application/useCases/handleCheckoutSuccess.useCase';
import { checkoutQueryParams } from '../../domain/checkout.constants';
import { CheckoutSuccessError } from '../components/CheckoutSuccessError';
import { CheckoutSuccessLoading } from '../components/CheckoutSuccessLoading';
import { CheckoutSuccessMessage } from '../components/CheckoutSuccessMessage';

export function CheckoutSuccessWidget(): React.ReactElement {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get(checkoutQueryParams.sessionId);
  const { isLoading, isSuccess, error, handleSuccess, reset } =
    useHandleCheckoutSuccess();

  React.useEffect(() => {
    if (sessionId) {
      handleSuccess(sessionId);
    } else {
      // No session ID in URL - try to refetch user anyway
      // This handles cases where Stripe webhook already processed the paymenttoken?: string
      handleSuccess('');
    }
  }, [sessionId, handleSuccess]);

  return (
    <div className="w-full max-w-md mx-auto">
      {isLoading ? (
        <CheckoutSuccessLoading />
      ) : isSuccess ? (
        <CheckoutSuccessMessage />
      ) : error ? (
        <CheckoutSuccessError error={error} onRetry={reset} />
      ) : (
        <CheckoutSuccessLoading />
      )}
    </div>
  );
}
