import {
  GOAL_PERIOD_LABELS,
  TIME_OF_DAY_FILTER_VALUES,
  TIME_OF_DAY_LABELS,
} from './habit.constants';
import {
  type HabitProgress,
  type HabitWithProgress,
  habitStatusEnumObject,
  type TimeOfDayFilter,
} from './habit.model';

export function calculateProgressPercentage(
  current: number,
  target: number
): number {
  if (target <= 0) return 0;
  const percentage = (current / target) * 100;
  return Math.min(100, Math.max(0, percentage));
}

export function isHabitCompleted(progress: HabitProgress): boolean {
  return progress.completed;
}

export function formatProgressText(progress: HabitProgress): string {
  return `${progress.current} ${progress.unit} / ${progress.target} ${progress.unit}`;
}

export function getRemainingValue(progress: HabitProgress): number {
  const remaining = progress.target - progress.current;
  return Math.max(0, remaining);
}

export function canAddProgress(habit: HabitWithProgress): boolean {
  return (
    habit.status === habitStatusEnumObject.active &&
    !isHabitCompleted(habit.progress)
  );
}

export function getProgressColor(percentage: number): string {
  if (percentage >= 100) return 'txt-success-primary-600';
  if (percentage >= 75) return 'txt-warning-primary-600';
  if (percentage >= 50) return 'txt-warning-primary-600';
  return 'txt-error-primary-600';
}

export function isTimeOfDayFilter(value: string): value is TimeOfDayFilter {
  return TIME_OF_DAY_FILTER_VALUES.includes(value as TimeOfDayFilter);
}

export function countCompleted(habits: HabitWithProgress[]): number {
  return habits.filter((h) => h.progress.completed).length;
}

export function habitDetailsLine(habit: HabitWithProgress): string {
  if (habit.progress.completed) return 'Completo';
  const period = GOAL_PERIOD_LABELS[habit.progress.period];
  const time = TIME_OF_DAY_LABELS[habit.timeOfDay];
  const progress = formatProgressText(habit.progress);
  return `${period} - ${time} - ${progress}`;
}
