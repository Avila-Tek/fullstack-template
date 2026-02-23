import { useQuery } from '@tanstack/react-query';
import { purchaseSubscriptionQueryKeys } from '../../domain/purchaseSubscription.constants';
import { PurchaseSubscriptionService } from '../../infrastructure';

export function useGetPlanByIdQuery(planId: string | null) {
  return useQuery({
    queryKey: [...purchaseSubscriptionQueryKeys.plan, planId],
    queryFn: async () => {
      if (!planId) {
        throw new Error('Plan ID is required');
      }
      return PurchaseSubscriptionService.getPlanById(planId);
    },
    enabled: !!planId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
