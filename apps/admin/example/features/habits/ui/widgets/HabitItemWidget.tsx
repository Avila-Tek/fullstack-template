'use client';

import * as React from 'react';
import { useBlockHabitMutation } from '../../application/mutations/useBlockHabit.mutation';
import { usePauseHabitMutation } from '../../application/mutations/usePauseHabit.mutation';
import { useReactivateHabitMutation } from '../../application/mutations/useReactivateHabit.mutation';
import { useUnblockHabitMutation } from '../../application/mutations/useUnblockHabit.mutation';
import { useUpsertHabitLogMutation } from '../../application/mutations/useUpsertHabitLog.mutation';
import type { HabitWithProgress } from '../../domain/habit.model';
import { HabitCard } from '../components/HabitCard';

interface HabitItemWidgetProps {
  habit: HabitWithProgress;
  selectedDate: Date;
  onEdit: (habit: HabitWithProgress) => void;
}

export function HabitItemWidget({
  habit,
  selectedDate,
  onEdit,
}: HabitItemWidgetProps) {
  const [isHovered, setIsHovered] = React.useState(false);

  const logMutation = useUpsertHabitLogMutation();
  const pauseMutation = usePauseHabitMutation();
  const reactivateMutation = useReactivateHabitMutation();
  const unblockMutation = useUnblockHabitMutation();
  const blockMutation = useBlockHabitMutation();

  function handleLogProgress(delta: number) {
    logMutation.mutate({
      habitId: habit.id,
      logDate: selectedDate,
      value: delta,
    });
  }

  function handleMarkComplete() {
    const delta = habit.progress.target - habit.progress.current;
    logMutation.mutate({
      habitId: habit.id,
      logDate: selectedDate,
      value: delta,
    });
  }

  function handlePause() {
    pauseMutation.mutate(habit.id);
  }

  function handleReactivate() {
    reactivateMutation.mutate(habit.id);
  }

  function handleBlock() {
    blockMutation.mutate(habit.id);
  }

  function handleUnblock() {
    unblockMutation.mutate(habit.id);
  }

  return (
    <div
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <HabitCard
        habit={habit}
        showControls={isHovered}
        onLogProgress={handleLogProgress}
        onEdit={() => onEdit(habit)}
        onPause={handlePause}
        onReactivate={handleReactivate}
        onBlock={handleBlock}
        onUnblock={handleUnblock}
        onMarkComplete={handleMarkComplete}
        isLogging={logMutation.isPending}
      />
    </div>
  );
}
