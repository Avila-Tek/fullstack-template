import { useMutation, useQueryClient } from '@tanstack/react-query';
import { habitsMutationKeys } from '../../domain/habit.constants';
import type { Habit } from '../../domain/habit.model';
import { HabitsService } from '../../infrastructure';
import { habitsQueryKeys } from '../queries/useHabitsForDate.query';

export function useBlockHabitMutation() {
  const queryClient = useQueryClient();

  return useMutation<Habit, Error, string>({
    mutationKey: habitsMutationKeys.habits.block,
    mutationFn: (id) => HabitsService.blockHabit(id),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: habitsQueryKeys.forDate(new Date()),
      });
    },
  });
}
