'use client';

import { Button } from '@repo/ui/components/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate, isSameDay } from '@/src/shared/utils/date.utils';

interface DateSelectorProps {
  date: Date;
  onChange: (date: Date) => void;
}

export function DateSelector({ date, onChange }: DateSelectorProps) {
  function handlePrevious() {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() - 1);
    onChange(newDate);
  }

  function handleNext() {
    const newDate = new Date(date);
    newDate.setDate(newDate.getDate() + 1);
    onChange(newDate);
  }

  function handleToday() {
    onChange(new Date());
  }

  const isToday = isSameDay(date, new Date());

  return (
    <div className="flex items-center gap-2">
      <Button variant="ghost" size="icon" onClick={handlePrevious}>
        <ChevronLeft className="h-4 w-4 text-gray-light-mode-600" />
      </Button>

      <button
        onClick={handleToday}
        className="min-w-[120px] text-center text-sm font-medium text-gray-light-mode-900 transition-colors hover:text-gray-light-mode-700"
        type="button"
      >
        {formatDate(date)}
      </button>

      <Button variant="ghost" size="icon" onClick={handleNext}>
        <ChevronRight className="h-4 w-4 text-gray-light-mode-600" />
      </Button>

      {!isToday ? (
        <Button variant="outline" size="sm" onClick={handleToday}>
          Hoy
        </Button>
      ) : null}
    </div>
  );
}
