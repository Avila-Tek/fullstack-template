import { CalendarDays } from 'lucide-react';

interface HabitsEmptyStateProps {
  message?: string;
}

export function HabitsEmptyState({
  message = 'No hay hábitos para este día',
}: HabitsEmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <CalendarDays className="mb-4 h-12 w-12 text-gray-light-mode-400" />
      <p className="text-gray-light-mode-600">{message}</p>
    </div>
  );
}
