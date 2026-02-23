import type {
  TListPlansCatalogResponse,
  TPlanCatalogItem,
} from '@repo/schemas';

/**
 * View Plans API response types (DTOs)
 * Aligned with backend schema
 */

// Plans catalog response
export type PlansCatalogDto = TListPlansCatalogResponse;
export type PlanCatalogItemDto = TPlanCatalogItem;

export interface ViewPlansErrorResponse {
  success: false;
  error: string;
}

export type PlansCatalogResponse =
  | { success: true; data: PlansCatalogDto }
  | ViewPlansErrorResponse;

/**
 * Contract for View Plans API operations
 * This interface is implemented by an adapter wrapping the PlanService
 */
export interface ViewPlansApi {
  getPlansCatalog(): Promise<PlansCatalogResponse>;
}
