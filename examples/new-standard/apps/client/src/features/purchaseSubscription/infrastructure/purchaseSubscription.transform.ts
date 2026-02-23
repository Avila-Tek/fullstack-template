import type { TPlanCatalogItem, TSubscribeResponse } from '@repo/schemas';
import {
  purchaseResultTypeEnumObject,
  subscriptionResponseTypeEnumObject,
} from '../domain/purchaseSubscription.constants';
import type {
  PurchaseResult,
  SelectedPlan,
} from '../domain/purchaseSubscription.model';

/**
 * Transform DTOs to domain models
 */

export function toSelectedPlanDomain(dto: TPlanCatalogItem): SelectedPlan {
  return {
    id: dto.id,
    key: dto.key,
    name: dto.name,
    isFree: dto.isFree,
    price: dto.prices[0]
      ? {
          id: dto.prices[0].id,
          amountCents: dto.prices[0].amountCents,
          currency: dto.prices[0].currency,
          interval: dto.prices[0].interval,
        }
      : undefined,
  };
}

export function toPurchaseResultDomain(
  dto: TSubscribeResponse
): PurchaseResult {
  if (
    dto.type === subscriptionResponseTypeEnumObject.free_subscription_created
  ) {
    return {
      success: true,
      type: purchaseResultTypeEnumObject.free,
    };
  }

  if (dto.type === subscriptionResponseTypeEnumObject.checkout_redirect) {
    return {
      success: true,
      type: purchaseResultTypeEnumObject.checkout,
      redirectUrl: dto.checkoutUrl,
    };
  }

  throw new Error('Unexpected subscription response type');
}
