import type { TUpdateHabitInput } from '@repo/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { habitsMutationKeys } from '../../domain/habit.constants';
import type { Habit } from '../../domain/habit.model';
import { HabitsService } from '../../infrastructure';
import { habitsQueryKeys } from '../queries/useHabitsForDate.query';

interface UpdateHabitParams {
  id: string;
  input: TUpdateHabitInput;
}

export function useUpdateHabitMutation() {
  const queryClient = useQueryClient();

  return useMutation<Habit, Error, UpdateHabitParams>({
    mutationKey: habitsMutationKeys.habits.update,
    mutationFn: ({ id, input }) => HabitsService.updateHabit(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: habitsQueryKeys.forDate(new Date()),
      });
    },
  });
}
