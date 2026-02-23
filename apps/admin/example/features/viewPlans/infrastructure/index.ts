import { getAPIClient } from '@/src/lib/api';
import type { ViewPlansApi } from './viewPlans.interfaces';
import { ViewPlansServiceClass } from './viewPlans.service';

/**
 * Adapter that implements ViewPlansApi using the PlanService from @repo/services
 */
function createViewPlansApiAdapter(): ViewPlansApi {
  const api = getAPIClient();

  return {
    async getPlansCatalog() {
      const result = await api.v1.plans.listCatalog();
      if (!result.success) {
        return {
          success: false as const,
          error: result.error,
        };
      }
      return {
        success: true as const,
        data: result.data,
      };
    },
  };
}

/**
 * Default service instance using the real API client.
 * For testing, instantiate ViewPlansServiceClass with a mock ViewPlansApi.
 */
export const ViewPlansService = new ViewPlansServiceClass(
  createViewPlansApiAdapter()
);
