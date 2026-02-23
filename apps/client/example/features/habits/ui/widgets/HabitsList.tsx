'use client';

import { Loader2 } from 'lucide-react';
import { useHabitsForDate } from '../../application/queries/useHabitsForDate.query';
import { timeOfDayFilterEnumObject } from '../../domain/habit.constants';
import type {
  HabitWithProgress,
  TimeOfDayFilter,
  TTimeOfDay,
} from '../../domain/habit.model';
import { HabitGroupSection } from '../components/HabitGroupSection';
import { HabitsEmptyState } from '../components/HabitsEmptyState';
import { HabitItemWidget } from './HabitItemWidget';

interface HabitsListProps {
  date: Date;
  timeOfDayFilter: TimeOfDayFilter;
  onEditHabit: (habit: HabitWithProgress) => void;
}

export function HabitsList({
  date,
  timeOfDayFilter,
  onEditHabit,
}: HabitsListProps) {
  const timeOfDay: TTimeOfDay | undefined =
    timeOfDayFilter === timeOfDayFilterEnumObject.all
      ? undefined
      : timeOfDayFilter;

  const { data, isLoading, error } = useHabitsForDate(date, timeOfDay);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-gray-light-mode-500" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 text-center text-error-600">
        Error al cargar los hábitos
      </div>
    );
  }

  if (!data || (data.today.length === 0 && data.week.length === 0)) {
    return <HabitsEmptyState />;
  }

  return (
    <div className="space-y-6">
      {data.today.length > 0 ? (
        <HabitGroupSection title={''}>
          {data.today.map((habit) => (
            <HabitItemWidget
              key={habit.id}
              habit={habit}
              selectedDate={date}
              onEdit={onEditHabit}
            />
          ))}
        </HabitGroupSection>
      ) : null}

      {data.week.length > 0 ? (
        <HabitGroupSection title={'Esta semana'}>
          {data.week.map((habit) => (
            <HabitItemWidget
              key={habit.id}
              habit={habit}
              selectedDate={date}
              onEdit={onEditHabit}
            />
          ))}
        </HabitGroupSection>
      ) : null}
    </div>
  );
}
