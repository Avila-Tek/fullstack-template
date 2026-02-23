import type {
  TPlanCatalogItem,
  TSubscribeInput,
  TSubscribeResponse,
} from '@repo/schemas';

/**
 * Plans API types
 */
export type GetPlanByIdSuccessData = TPlanCatalogItem;

export interface PlansApiErrorResponse {
  success: false;
  error: string;
}

export type PlansApiResponse<T> =
  | { success: true; data: T }
  | PlansApiErrorResponse;

/**
 * Contract for Plans API operations
 */
export interface PlansApi {
  getPlanById(
    planId: string
  ): Promise<PlansApiResponse<GetPlanByIdSuccessData>>;
}

/**
 * Subscriptions API types
 */
export type SubscribeSuccessData = TSubscribeResponse;

export interface SubscriptionsApiErrorResponse {
  success: false;
  error: string;
}

export type SubscriptionsApiResponse<T> =
  | { success: true; data: T }
  | SubscriptionsApiErrorResponse;

/**
 * Contract for Subscriptions API operations
 */
export interface SubscriptionsApi {
  subscribe(
    input: TSubscribeInput
  ): Promise<SubscriptionsApiResponse<SubscribeSuccessData>>;
}
