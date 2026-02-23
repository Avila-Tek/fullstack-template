import type { TTimeOfDay } from '@repo/schemas';
import { queryOptions, useQuery } from '@tanstack/react-query';
import { HabitsService } from '../../infrastructure';

export const habitsQueryKeys = {
  /** Prefix for all habits-for-date queries; use with invalidateQueries to invalidate all. */
  all: () => ['forDate'] as const,
  forDate: (date: Date, timeOfDay?: TTimeOfDay) =>
    ['forDate', date.toISOString().split('T')[0], timeOfDay] as const,
};

export function habitsForDateQueryOptions(date: Date, timeOfDay?: TTimeOfDay) {
  return queryOptions({
    queryKey: habitsQueryKeys.forDate(date, timeOfDay),
    queryFn: () => HabitsService.getHabitsForDate({ date, timeOfDay }),
  });
}

export function useHabitsForDate(date: Date, timeOfDay?: TTimeOfDay) {
  return useQuery(habitsForDateQueryOptions(date, timeOfDay));
}
