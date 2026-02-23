import type {
  TCreateHabitInput,
  THabit,
  THabitLog,
  THabitsForDateResponse,
  THabitWithProgress,
} from '@repo/schemas';
import type {
  Habit,
  HabitLog,
  HabitsForDate,
  HabitWithProgress,
} from '../domain/habit.model';
import type { TCreateHabitForm } from '../domain/habits.form';

export function toHabitWithProgressDomain(
  dto: THabitWithProgress
): HabitWithProgress {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    timeOfDay: dto.timeOfDay,
    status: dto.status,
    startDate: dto.startDate ? new Date(dto.startDate) : null,
    endDate: dto.endDate ? new Date(dto.endDate) : null,
    progress: {
      unit: dto.progress.unit,
      period: dto.progress.period,
      target: dto.progress.target,
      current: dto.progress.current,
      completed: dto.progress.completed,
    },
  };
}

export function habitToFormPartial(
  habit: HabitWithProgress
): Partial<TCreateHabitForm> {
  return {
    name: habit.name,
    description: habit.description,
    goal: {
      unit: habit.progress.unit,
      period: habit.progress.period,
      target: habit.progress.target,
    },
    timeOfDay: habit.timeOfDay,
    startDate: habit.startDate ?? undefined,
    endDate: habit.endDate ?? undefined,
  };
}

export function createHabitFormToInput(
  form: TCreateHabitForm
): TCreateHabitInput {
  return {
    name: form.name,
    description: form.description,
    schedule: form.schedule,
    goal: form.goal,
    timeOfDay: form.timeOfDay,
    reminder: form.reminder,
    startDate: form.startDate,
    endDate: form.endDate,
  };
}

export function toHabitsForDateDomain(
  dto: THabitsForDateResponse
): HabitsForDate {
  return {
    today: dto.today.map(toHabitWithProgressDomain),
    week: dto.week.map(toHabitWithProgressDomain),
  };
}

/**
 * Transforms a Habit DTO from the API to the domain model
 */
export function toHabitDomain(dto: THabit): Habit {
  return {
    id: dto.id,
    name: dto.name,
    description: dto.description,
    schedule: dto.schedule,
    goal: dto.goal,
    timeOfDay: dto.timeOfDay,
    reminder: dto.reminder,
    status: dto.status,
    isActive: dto.isActive,
    startDate: dto.startDate ? new Date(dto.startDate) : null,
    endDate: dto.endDate ? new Date(dto.endDate) : null,
    createdAt: dto.createdAt ? new Date(dto.createdAt) : null,
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
  };
}

/**
 * Transforms a HabitLog DTO from the API to the domain model
 */
export function toHabitLogDomain(dto: THabitLog): HabitLog {
  return {
    id: dto.id,
    habitId: dto.habitId,
    logDate: dto.logDate ? new Date(dto.logDate) : null,
    completed: dto.completed,
    completedAt: dto.completedAt ? new Date(dto.completedAt) : null,
    value: dto.value,
    createdAt: dto.createdAt ? new Date(dto.createdAt) : null,
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : null,
  };
}
