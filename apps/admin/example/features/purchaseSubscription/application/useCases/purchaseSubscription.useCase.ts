import type { TSubscribeInput } from '@repo/schemas';
import type { PurchaseResult } from '../../domain/purchaseSubscription.model';
import { useSubscribeMutation } from '../mutations/useSubscribe.mutation';

type PurchaseSubscriptionUseCaseResult = {
  success: boolean;
  result?: PurchaseResult;
};

type Dependencies = {
  subscribe: (data: TSubscribeInput) => Promise<PurchaseResult>;
};

export async function purchaseSubscriptionUseCase(
  input: TSubscribeInput,
  deps: Dependencies
): Promise<PurchaseSubscriptionUseCaseResult> {
  try {
    const result = await deps.subscribe(input);
    return { success: true, result };
  } catch {
    return { success: false };
  }
}

export function usePurchaseSubscription() {
  const subscribeMutation = useSubscribeMutation();

  return {
    mutateAsync: (input: TSubscribeInput) =>
      purchaseSubscriptionUseCase(input, {
        subscribe: subscribeMutation.mutateAsync,
      }),
    isPending: subscribeMutation.isPending,
    error: subscribeMutation.error,
  };
}
