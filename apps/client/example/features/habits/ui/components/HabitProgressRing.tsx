'use client';

import { CircularProgress } from '@repo/ui/components/circularProgress';
import { Check } from 'lucide-react';
import {
  calculateProgressPercentage,
  isHabitCompleted,
} from '../../domain/habit.logic';
import type { HabitProgress } from '../../domain/habit.model';

interface HabitProgressRingProps {
  progress: HabitProgress;
  size?: number;
}

export function HabitProgressRing({
  progress,
  size = 36,
}: HabitProgressRingProps) {
  const percentage = calculateProgressPercentage(
    progress.current,
    progress.target
  );
  const completed = isHabitCompleted(progress);

  if (completed) {
    return (
      <div
        className="flex shrink-0 items-center justify-center rounded-full bg-brand-600 text-base-white"
        style={{ width: size, height: size }}
        aria-hidden
      >
        <Check className="h-4 w-4 stroke-[2.5]" />
      </div>
    );
  }

  return (
    <CircularProgress
      value={percentage}
      size={size}
      strokeWidth={3}
      indicatorClassName="text-brand-600"
      trackClassName="text-gray-light-mode-200"
    />
  );
}
