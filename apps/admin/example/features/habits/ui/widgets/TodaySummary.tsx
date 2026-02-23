'use client';

import { Target } from 'lucide-react';
import { isSameDay } from '@/src/shared/utils/date.utils';
import { useHabitsForDate } from '../../application/queries/useHabitsForDate.query';
import { TODAY_SUMMARY_LINE } from '../../domain/habit.constants';
import { countCompleted } from '../../domain/habit.logic';
import type { TTimeOfDay } from '../../domain/habit.model';

interface TodaySummaryProps {
  date: Date;
  timeOfDay?: TTimeOfDay;
}

export function TodaySummary({ date, timeOfDay }: TodaySummaryProps) {
  const { data } = useHabitsForDate(date, timeOfDay);
  const isToday = isSameDay(date, new Date());

  if (!isToday || !data) return null;

  const allHabits = [...data.today, ...data.week];
  const total = allHabits.length;
  const completed = countCompleted(allHabits);

  if (total === 0) {
    return (
      <p
        className="text-sm text-gray-light-mode-600"
        aria-label={`Resumen de hoy`}
      >
        Aún no tienes hábitos para hoy.
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3" aria-label={`Resumen de hoy`}>
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100">
        <Target className="h-5 w-5 text-brand-600" />
      </div>
      <div>
        <p className="text-sm font-medium text-gray-light-mode-900">
          {TODAY_SUMMARY_LINE(completed, total)}
        </p>
        <p className="text-xs text-gray-light-mode-600">Mis Hábitos</p>
      </div>
    </div>
  );
}
