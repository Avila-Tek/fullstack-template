'use client';

import type { TCreateHabitInput } from '@repo/schemas';
import * as React from 'react';
import { HABIT_LIMIT_EXCEEDED_CODE } from '../../domain/habit.constants';
import { useCreateHabitMutation } from '../mutations/useCreateHabit.mutation';

export function useCreateHabitFlow() {
  const [planLimitModalOpen, setPlanLimitModalOpen] = React.useState(false);
  const createMutation = useCreateHabitMutation();

  const createHabit = React.useCallback(
    async (input: TCreateHabitInput): Promise<boolean> => {
      try {
        await createMutation.mutateAsync(input);
        return true;
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes(HABIT_LIMIT_EXCEEDED_CODE)) {
          setPlanLimitModalOpen(true);
        }
        return false;
      }
    },
    [createMutation]
  );

  return {
    createHabit,
    isPending: createMutation.isPending,
    planLimitModalOpen,
    setPlanLimitModalOpen,
  };
}
