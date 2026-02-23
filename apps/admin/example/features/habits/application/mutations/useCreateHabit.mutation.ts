import type { TCreateHabitInput } from '@repo/schemas';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { habitsMutationKeys } from '../../domain/habit.constants';
import type { Habit } from '../../domain/habit.model';
import { HabitsService } from '../../infrastructure';
import { habitsQueryKeys } from '../queries/useHabitsForDate.query';

export function useCreateHabitMutation() {
  const queryClient = useQueryClient();

  return useMutation<Habit, Error, TCreateHabitInput>({
    mutationKey: habitsMutationKeys.habits.create,
    mutationFn: (input) => HabitsService.createHabit(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: habitsQueryKeys.all() });
    },
  });
}
