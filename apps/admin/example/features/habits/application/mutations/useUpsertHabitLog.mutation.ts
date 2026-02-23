import type { TCreateHabitLogInput } from '@repo/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { habitsMutationKeys } from '../../domain/habit.constants';
import type { HabitLog } from '../../domain/habit.model';
import { HabitsService } from '../../infrastructure';
import { habitsQueryKeys } from '../queries/useHabitsForDate.query';

export function useUpsertHabitLogMutation() {
  const queryClient = useQueryClient();

  return useMutation<HabitLog, Error, TCreateHabitLogInput>({
    mutationKey: habitsMutationKeys.habitLogs.upsert,
    mutationFn: (input) => HabitsService.logProgress(input),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: habitsQueryKeys.forDate(variables.logDate),
      });
    },
  });
}
