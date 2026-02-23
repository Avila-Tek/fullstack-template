'use client';

import { Tabs, TabsList, TabsTrigger } from '@repo/ui/components/tabs';
import { cn } from '@repo/ui/lib/utils';
import type { LucideIcon } from 'lucide-react';
import { LayoutGrid, Moon, Sun, Sunset } from 'lucide-react';
import { timeOfDayFilterEnumObject } from '../../domain/habit.constants';
import { isTimeOfDayFilter } from '../../domain/habit.logic';
import {
  type TimeOfDayFilter,
  timeOfDayEnumObject,
} from '../../domain/habit.model';

const timeOfDayTabOptions: Array<{
  value: TimeOfDayFilter;
  label: string;
  Icon: LucideIcon;
}> = [
  { value: timeOfDayFilterEnumObject.all, label: 'Todos', Icon: LayoutGrid },
  { value: timeOfDayEnumObject.morning, label: 'Mañana', Icon: Sun },
  { value: timeOfDayEnumObject.afternoon, label: 'Tarde', Icon: Sunset },
  { value: timeOfDayEnumObject.evening, label: 'Noche', Icon: Moon },
];

interface TimeOfDayTabsProps {
  value: TimeOfDayFilter;
  onChange: (value: TimeOfDayFilter) => void;
}

export function TimeOfDayTabs({ value, onChange }: TimeOfDayTabsProps) {
  const onChangeHandler = (raw: string) => {
    if (isTimeOfDayFilter(raw)) onChange(raw);
  };

  return (
    <Tabs value={value} onValueChange={onChangeHandler}>
      <TabsList className="flex w-full rounded-2xl bg-gray-light-mode-100 px-1 py-5">
        {timeOfDayTabOptions.map(({ value: optionValue, label, Icon }) => (
          <TabsTrigger
            key={optionValue}
            value={optionValue}
            className={cn(
              'flex min-w-0 flex-1 items-center justify-center gap-1.5 rounded-xl px-4 py-4 text-sm transition-all border-0 shadow-none after:hidden',
              'text-gray-light-mode-500 [&_svg]:h-4 [&_svg]:w-4 [&_svg]:shrink-0 [&_svg]:text-current',
              'data-[state=active]:bg-base-white data-[state=active]:font-semibold data-[state=active]:text-gray-light-mode-900 data-[state=active]:shadow-sm',
              'hover:text-gray-light-mode-700 data-[state=inactive]:bg-transparent'
            )}
          >
            <Icon className="h-4 w-4" />
            <span>{label}</span>
          </TabsTrigger>
        ))}
      </TabsList>
    </Tabs>
  );
}
