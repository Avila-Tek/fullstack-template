'use client';

import { Button } from '@repo/ui/components/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@repo/ui/components/dropdownMenu';
import {
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@repo/ui/components/form';
import { Input } from '@repo/ui/components/input';
import { cn } from '@repo/ui/lib/utils';
import { Calendar, ChevronDown, FileText, Target } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import {
  DAYS_OF_WEEK_KEYS,
  DAYS_OF_WEEK_LABELS,
} from '@/src/shared/constants/daysOfWeek';
import { FormSection } from '@/src/shared/ui/components/FormSection';
import {
  GOAL_PERIOD_LABELS,
  SCHEDULE_TYPE_LABELS,
  TIME_OF_DAY_LABELS,
} from '../../domain/habit.constants';
import { scheduleTypeEnumObject } from '../../domain/habit.model';
import type { TCreateHabitForm } from '../../domain/habits.form';

interface HabitFormContentProps {
  disabled?: boolean;
}

export function HabitFormContent({ disabled }: HabitFormContentProps) {
  const { control, watch, setValue } = useFormContext<TCreateHabitForm>();
  const scheduleType = watch('schedule.type');
  const scheduleDaysOfWeek = watch('schedule.daysOfWeek');
  const timeOfDay = watch('timeOfDay');
  const goalPeriod = watch('goal.period');

  const daysArray = Array.isArray(scheduleDaysOfWeek) ? scheduleDaysOfWeek : [];
  const showDaysOfWeek =
    scheduleType === scheduleTypeEnumObject.weekly ||
    scheduleType === scheduleTypeEnumObject.custom;

  function toggleDay(day: (typeof DAYS_OF_WEEK_KEYS)[number]) {
    const next = daysArray.includes(day)
      ? daysArray.filter((d) => d !== day)
      : [...daysArray, day].sort((a, b) => a - b);
    setValue('schedule.daysOfWeek', next.length > 0 ? next : undefined);
  }

  return (
    <div className="space-y-6">
      <FormSection title="Detalles del hábito" icon={FileText}>
        <FormField
          control={control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del hábito</FormLabel>
              <FormControl>
                <Input
                  placeholder="Ej: Meditación matinal"
                  className="bg-surface"
                  {...field}
                  disabled={disabled}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descripción y beneficios (opcional)</FormLabel>
              <FormControl>
                <textarea
                  placeholder="¿Qué quieres lograr? ¿Qué beneficios te aporta?"
                  rows={3}
                  disabled={disabled}
                  className={cn(
                    'border-input focus-visible:border-ring focus-visible:ring-ring/50 w-full resize-y rounded-md border bg-surface px-3 py-2 text-sm shadow-xs outline-none transition-[color,box-shadow]',
                    'placeholder:text-muted-foreground',
                    'disabled:pointer-events-none disabled:opacity-50'
                  )}
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
      </FormSection>

      <FormSection title="Horario y momento" icon={Calendar}>
        <FormItem className="w-full">
          <FormLabel>Frecuencia</FormLabel>
          <p className="text-xs text-gray-light-mode-500 mb-1">
            Con qué frecuencia harás el hábito (diario, semanal o días
            concretos).
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between bg-surface"
                disabled={disabled}
              >
                {SCHEDULE_TYPE_LABELS[scheduleType]}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
              <DropdownMenuItem
                onClick={() =>
                  setValue('schedule.type', scheduleTypeEnumObject.daily)
                }
              >
                {SCHEDULE_TYPE_LABELS.daily}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setValue('schedule.type', scheduleTypeEnumObject.weekly)
                }
              >
                {SCHEDULE_TYPE_LABELS.weekly}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  setValue('schedule.type', scheduleTypeEnumObject.custom)
                }
              >
                {SCHEDULE_TYPE_LABELS.custom}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </FormItem>

        <FormItem className="w-full">
          <FormLabel>Momento del día</FormLabel>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between bg-surface"
                disabled={disabled}
              >
                {TIME_OF_DAY_LABELS[timeOfDay]}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
              <DropdownMenuItem
                onClick={() => setValue('timeOfDay', 'morning')}
              >
                {TIME_OF_DAY_LABELS.morning}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setValue('timeOfDay', 'afternoon')}
              >
                {TIME_OF_DAY_LABELS.afternoon}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => setValue('timeOfDay', 'evening')}
              >
                {TIME_OF_DAY_LABELS.evening}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </FormItem>

        {showDaysOfWeek ? (
          <FormItem>
            <FormLabel>Días de la semana</FormLabel>
            <div className="flex flex-wrap gap-2">
              {DAYS_OF_WEEK_KEYS.map((day) => {
                const isSelected = daysArray.includes(day);
                return (
                  <Button
                    key={day}
                    type="button"
                    variant="outline"
                    size="sm"
                    className={cn(
                      'min-w-[2.5rem] border-gray-light-mode-200',
                      isSelected
                        ? 'bg-gray-light-mode-200 text-gray-light-mode-900 border-gray-light-mode-300'
                        : 'bg-base-white text-gray-light-mode-600 hover:bg-gray-light-mode-50'
                    )}
                    disabled={disabled}
                    onClick={() => toggleDay(day)}
                  >
                    {DAYS_OF_WEEK_LABELS[day]}
                  </Button>
                );
              })}
            </div>
          </FormItem>
        ) : null}
      </FormSection>

      <FormSection title="Objetivo y seguimiento" icon={Target}>
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={control}
            name="goal.target"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Objetivo inicial</FormLabel>
                <div className="flex items-center gap-2">
                  <FormControl>
                    <Input
                      type="number"
                      min={1}
                      className="bg-surface"
                      {...field}
                      disabled={disabled}
                    />
                  </FormControl>
                </div>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name="goal.unit"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Unidad</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Ej: vasos, minutos, días"
                    className="bg-surface"
                    {...field}
                    disabled={disabled}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormItem className="w-full">
          <FormLabel>Período</FormLabel>
          <p className="text-xs text-gray-light-mode-500 mb-1">
            Plazo en el que se mide el objetivo (por día o por semana).
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="w-full justify-between bg-surface"
                disabled={disabled}
              >
                {GOAL_PERIOD_LABELS[goalPeriod]}
                <ChevronDown className="ml-2 h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)]">
              <DropdownMenuItem onClick={() => setValue('goal.period', 'day')}>
                {GOAL_PERIOD_LABELS.day}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setValue('goal.period', 'week')}>
                {GOAL_PERIOD_LABELS.week}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </FormItem>
      </FormSection>
    </div>
  );
}
