import { TBillingPeriod } from '../domain/viewPlans.constants';
import type { Plan, PlanLimits, PlanPrice } from '../domain/viewPlans.model';
import type { PlanCatalogItemDto } from './viewPlans.interfaces';

/**
 * Transform DTOs to domain models
 */

export function toPlanLimitsDomain(
  dto: PlanCatalogItemDto['limits']
): PlanLimits {
  return {
    habitsMax: dto.habitsMax,
    reportsEnabled: dto.reportsEnabled,
    historyDays: dto.historyDays,
    remindersEnabled: dto.remindersEnabled,
  };
}

export function toPlanPriceDomain(
  dto: PlanCatalogItemDto['prices'][number]
): PlanPrice {
  return {
    id: dto.id,
    currency: dto.currency,
    interval: dto.interval as TBillingPeriod,
    amountCents: dto.amountCents,
    trialDays: dto.trialDays,
    isActive: dto.isActive,
  };
}

export function toPlanDomain(dto: PlanCatalogItemDto): Plan {
  return {
    id: dto.id,
    key: dto.key,
    name: dto.name,
    description: dto.description,
    isFree: dto.isFree,
    displayOrder: dto.displayOrder,
    limits: toPlanLimitsDomain(dto.limits),
    prices: dto.prices.map(toPlanPriceDomain),
  };
}

export function toPlansCatalogDomain(dtos: PlanCatalogItemDto[]): Plan[] {
  return dtos.map(toPlanDomain).sort((a, b) => a.displayOrder - b.displayOrder);
}
