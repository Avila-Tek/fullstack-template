'use client';

import { cn } from '@repo/ui/lib/utils';
import { canAddProgress, habitDetailsLine } from '../../domain/habit.logic';
import type { HabitWithProgress } from '../../domain/habit.model';
import { HabitActionsMenu } from './HabitActionsMenu';
import { HabitProgressRing } from './HabitProgressRing';
import { HabitQuickLogInput } from './HabitQuickLogInput';
import { HabitStatusBadge } from './HabitStatusBadge';

interface HabitCardProps {
  habit: HabitWithProgress;
  showControls?: boolean;
  onLogProgress: (value: number) => void;
  onEdit: () => void;
  onPause: () => void;
  onReactivate: () => void;
  onBlock: () => void;
  onUnblock: () => void;
  onMarkComplete: () => void;
  isLogging?: boolean;
}

export function HabitCard({
  habit,
  showControls = false,
  onLogProgress,
  onEdit,
  onPause,
  onReactivate,
  onBlock,
  onUnblock,
  onMarkComplete,
  isLogging,
}: HabitCardProps) {
  const canLog = canAddProgress(habit);
  const isCompleted = habit.progress.completed;

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-2xl border border-gray-light-mode-200 bg-base-white p-4 transition-all duration-200',
        showControls ? 'border-gray-light-mode-300 bg-gray-light-mode-50' : ''
      )}
    >
      <HabitProgressRing progress={habit.progress} />

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate text-base font-medium text-gray-light-mode-900">
            {habit.name}
          </h3>
          <HabitStatusBadge status={habit.status} />
        </div>
        <p className="text-sm text-gray-light-mode-600">
          {habitDetailsLine(habit)}
        </p>
      </div>

      <div
        className={cn(
          'flex items-center gap-3 transition-opacity duration-200',
          showControls ? 'opacity-100' : 'opacity-0'
        )}
      >
        {canLog ? (
          <HabitQuickLogInput
            progress={habit.progress}
            onSubmit={onLogProgress}
            isPending={isLogging}
          />
        ) : null}
        <HabitActionsMenu
          status={habit.status}
          isCompleted={isCompleted}
          onEdit={onEdit}
          onPause={onPause}
          onReactivate={onReactivate}
          onBlock={onBlock}
          onUnblock={onUnblock}
          onMarkComplete={onMarkComplete}
        />
      </div>
    </div>
  );
}
