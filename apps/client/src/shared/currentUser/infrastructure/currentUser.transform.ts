import type {
  CurrentUser,
  Subscription,
  UserSession,
} from '../domain/currentUser.model';
import type { CurrentUserDto, SessionDto } from './currentUser.interfaces';

/**
 * Transform DTOs to domain models
 */

export function toCurrentUserDomain(dto: CurrentUserDto): CurrentUser {
  return {
    id: dto.id,
    email: dto.email,
    firstName: dto.firstName ?? null,
    lastName: dto.lastName ?? null,
    timezone: dto.timezone,
    status: dto.status,
    subscription: dto.subscription
      ? toSubscriptionDomain(dto.subscription)
      : null,
    createdAt: new Date(dto.createdAt ?? Date.now()),
    updatedAt: new Date(dto.updatedAt ?? Date.now()),
  };
}

function toSubscriptionDomain(
  dto: NonNullable<CurrentUserDto['subscription']>
): Subscription {
  return {
    id: dto.id,
    status: dto.status as Subscription['status'],
    isFree: dto.isFree,
    currentPeriodStart: dto.currentPeriodStart
      ? new Date(dto.currentPeriodStart)
      : null,
    currentPeriodEnd: dto.currentPeriodEnd
      ? new Date(dto.currentPeriodEnd)
      : null,
    cancelAtPeriodEnd: dto.cancelAtPeriodEnd,
    plan: {
      id: dto.plan.id,
      key: dto.plan.key,
      name: dto.plan.name,
      isFree: dto.plan.isFree,
      limits: {
        habitsMax: dto.plan.limits.habitsMax,
        reportsEnabled: dto.plan.limits.reportsEnabled,
        historyDays: dto.plan.limits.historyDays,
        remindersEnabled: dto.plan.limits.remindersEnabled,
      },
    },
    price: {
      id: dto.price.id,
      currency: dto.price.currency,
      interval: dto.price.interval,
      amountCents: dto.price.amountCents,
    },
  };
}

export function toUserSessionDomain(dto: SessionDto): UserSession {
  return {
    user: {
      id: dto.user.id,
      email: dto.user.email,
      firstName: dto.user.firstName ?? null,
      lastName: dto.user.lastName ?? null,
      timezone: dto.user.timezone,
      status: dto.user.status,
      createdAt: new Date(dto.user.createdAt ?? Date.now()),
      updatedAt: new Date(dto.user.updatedAt ?? Date.now()),
    },
    accessToken: dto.accessToken,
    refreshToken: dto.refreshToken,
  };
}
