'use client';

import { Button } from '@repo/ui/components/button';
import { Plus } from 'lucide-react';
import * as React from 'react';
import {
  formTypeEnumObject,
  type TFormType,
} from '@/src/shared/constants/formType';
import { formatDate, isSameDay } from '@/src/shared/utils/date.utils';
import { timeOfDayFilterEnumObject } from '../../domain/habit.constants';
import type {
  HabitWithProgress,
  TimeOfDayFilter,
} from '../../domain/habit.model';
import { DashboardCard } from '../components/DashboardCard';
import { DateSelector } from '../components/DateSelector';
import { TimeOfDayTabs } from '../components/TimeOfDayTabs';
import { HabitsLayout } from '../layouts/HabitsLayout';
import { HabitModal } from '../widgets/HabitModal';
import { HabitsList } from '../widgets/HabitsList';
import { TodaySummary } from '../widgets/TodaySummary';

export function HabitsDashboardPage() {
  const [selectedDate, setSelectedDate] = React.useState(() => new Date());
  const [timeOfDayFilter, setTimeOfDayFilter] = React.useState<TimeOfDayFilter>(
    timeOfDayFilterEnumObject.all
  );
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalFormType, setModalFormType] = React.useState<TFormType>(
    formTypeEnumObject.create
  );
  const [modalHabit, setModalHabit] = React.useState<HabitWithProgress | null>(
    null
  );

  function openCreateModal() {
    setModalFormType(formTypeEnumObject.create);
    setModalHabit(null);
    setModalOpen(true);
  }

  function openEditModal(habit: HabitWithProgress) {
    setModalFormType(formTypeEnumObject.edit);
    setModalHabit(habit);
    setModalOpen(true);
  }

  const timeOfDay =
    timeOfDayFilter === timeOfDayFilterEnumObject.all
      ? undefined
      : timeOfDayFilter;
  const isToday = isSameDay(selectedDate, new Date());

  return (
    <HabitsLayout>
      <div className="border-b border-gray-light-mode-200 px-4 py-6 shadow-sm bg-surface">
        <div className="container mx-auto max-w-5xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-light-mode-900 md:text-3xl">
              Mis Hábitos
            </h1>
            <p className="mt-1 text-sm text-gray-light-mode-600">
              Haz que hoy cuente.
            </p>
          </div>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <DateSelector date={selectedDate} onChange={setSelectedDate} />
            <div className="w-full sm:w-auto">
              <TimeOfDayTabs
                value={timeOfDayFilter}
                onChange={setTimeOfDayFilter}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto max-w-5xl px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-1">
          {isToday ? (
            <DashboardCard title={'Resumen del día'}>
              <TodaySummary date={selectedDate} timeOfDay={timeOfDay} />
            </DashboardCard>
          ) : null}

          <DashboardCard
            title={
              'Tus hábitos ' +
              (isToday ? 'hoy' : formatDate(selectedDate)?.toLowerCase())
            }
            rightElement={
              <Button
                onClick={openCreateModal}
                className="bg-brand-solid text-base-white hover:bg-brand-solid_hover"
              >
                <Plus className="mr-2 h-4 w-4" />
                Nuevo hábito
              </Button>
            }
          >
            <HabitsList
              date={selectedDate}
              timeOfDayFilter={timeOfDayFilter}
              onEditHabit={openEditModal}
            />
          </DashboardCard>
        </div>
      </div>

      <HabitModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        formType={modalFormType}
        habit={modalHabit}
      />
    </HabitsLayout>
  );
}
