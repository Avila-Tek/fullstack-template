import { formatProgressText } from '../../domain/habit.logic';
import type { HabitProgress } from '../../domain/habit.model';

interface HabitProgressTextProps {
  progress: HabitProgress;
}

export function HabitProgressText({ progress }: HabitProgressTextProps) {
  return (
    <span className="text-sm text-gray-400">
      {formatProgressText(progress)}
    </span>
  );
}
