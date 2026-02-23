import type { TSubscribeInput } from '@repo/schemas';
import { useMutation } from '@tanstack/react-query';
import { purchaseSubscriptionQueryKeys } from '../../domain/purchaseSubscription.constants';
import type { PurchaseResult } from '../../domain/purchaseSubscription.model';
import { PurchaseSubscriptionService } from '../../infrastructure';

export function useSubscribeMutation() {
  return useMutation<PurchaseResult, Error, TSubscribeInput>({
    mutationKey: purchaseSubscriptionQueryKeys.subscribe,
    mutationFn: (input) => PurchaseSubscriptionService.subscribe(input),
  });
}
