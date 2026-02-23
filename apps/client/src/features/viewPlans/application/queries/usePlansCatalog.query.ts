import { useQuery } from '@tanstack/react-query';
import { viewPlansQueryKeyEnumObject } from '../../domain/viewPlans.constants';
import { ViewPlansService } from '../../infrastructure';

export function usePlansCatalogQuery() {
  return useQuery({
    queryKey: [viewPlansQueryKeyEnumObject.plansCatalog],
    queryFn: () => ViewPlansService.getPlansCatalog(),
    staleTime: 5 * 60 * 1000, // 5 minutes - plans rarely change
  });
}
