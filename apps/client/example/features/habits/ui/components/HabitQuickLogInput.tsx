'use client';

import { Button } from '@repo/ui/components/button';
import { Input } from '@repo/ui/components/input';
import { Plus } from 'lucide-react';
import * as React from 'react';
import type { HabitProgress } from '../../domain/habit.model';

interface HabitQuickLogInputProps {
  progress: HabitProgress;
  onSubmit: (value: number) => void;
  isPending?: boolean;
}

export function HabitQuickLogInput({
  progress,
  onSubmit,
  isPending,
}: HabitQuickLogInputProps) {
  const [value, setValue] = React.useState('1');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const numValue = parseInt(value, 10);
    if (!isNaN(numValue) && numValue > 0) {
      onSubmit(numValue);
      setValue('1');
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center rounded-xl border border-gray-light-mode-200 bg-gray-light-mode-50/80 shadow-sm overflow-hidden"
    >
      <Input
        type="number"
        min="1"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-9 w-14 border-0 bg-transparent text-center text-sm font-medium text-gray-light-mode-900 focus-visible:ring-0 focus-visible:ring-offset-0 [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
        disabled={isPending}
      />
      <span className="pr-2 text-xs font-medium text-gray-light-mode-500">
        {progress.unit}
      </span>
      <Button
        type="submit"
        size="icon"
        variant="ghost"
        className="h-9 w-9 shrink-0 rounded-l-none rounded-r-xl text-gray-light-mode-600 hover:bg-transparent hover:text-gray-light-mode-900"
        disabled={isPending}
      >
        <Plus className="h-4 w-4" />
      </Button>
    </form>
  );
}
