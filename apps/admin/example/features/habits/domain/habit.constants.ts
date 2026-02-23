import { getEnumObjectFromArray } from '@repo/utils';
import {
  formTypeEnumObject,
  type TFormType,
} from '@/src/shared/constants/formType';
import {
  type TGoalPeriod,
  type TimeOfDayFilter,
  type TScheduleType,
  timeOfDayEnumObject,
} from './habit.model';

/** API error code when user exceeds habit limit for their plan. */
export const HABIT_LIMIT_EXCEEDED_CODE = 'HABIT_LIMIT_EXCEEDED';

/** Query/mutation key prefixes for habits feature (avoid magic strings). */
export const habitsMutationKeys = {
  habits: {
    create: ['habits', 'create'] as const,
    update: ['habits', 'update'] as const,
    block: ['habits', 'block'] as const,
    unblock: ['habits', 'unblock'] as const,
    pause: ['habits', 'pause'] as const,
    reactivate: ['habits', 'reactivate'] as const,
  },
  habitLogs: {
    upsert: ['habitLogs', 'upsert'] as const,
  },
} as const;

export const timeOfDayFilter = ['all'] as const;
export type TTimeOfDayFilter = (typeof timeOfDayFilter)[number];
export const timeOfDayFilterEnumObject =
  getEnumObjectFromArray(timeOfDayFilter);

export const listTimeOfDay = ['morning', 'afternoon', 'evening'] as const;
export type TTimeOfDayLocal = (typeof listTimeOfDay)[number];
export const timeOfDayObject = getEnumObjectFromArray(listTimeOfDay);
export const TIME_OF_DAY_LABELS: Record<TTimeOfDayLocal, string> = {
  morning: 'Mañana',
  afternoon: 'Tarde',
  evening: 'Noche',
};

export const listHabitStatus = ['active', 'paused', 'blocked'] as const;
export type THabitStatusLocal = (typeof listHabitStatus)[number];
export const habitStatusObject = getEnumObjectFromArray(listHabitStatus);
export const HABIT_STATUS_LABELS: Record<THabitStatusLocal, string> = {
  active: 'Activo',
  paused: 'Pausado',
  blocked: 'Bloqueado',
};

export const listGoalPeriod = ['day', 'week'] as const;
export type TGoalPeriodLocal = (typeof listGoalPeriod)[number];
export const goalPeriodObject = getEnumObjectFromArray(listGoalPeriod);
export const GOAL_PERIOD_LABELS: Record<TGoalPeriod, string> = {
  day: 'Diario',
  week: 'Semanal',
};

export const listScheduleType = ['daily', 'weekly', 'custom'] as const;
export type TScheduleTypeLocal = (typeof listScheduleType)[number];
export const scheduleTypeObject = getEnumObjectFromArray(listScheduleType);
export const SCHEDULE_TYPE_LABELS: Record<TScheduleType, string> = {
  daily: 'Diario',
  weekly: 'Semanal',
  custom: 'Personalizado',
};

export const TIME_OF_DAY_FILTER_VALUES: TimeOfDayFilter[] = [
  timeOfDayFilterEnumObject.all,
  timeOfDayEnumObject.morning,
  timeOfDayEnumObject.afternoon,
  timeOfDayEnumObject.evening,
];

/** Habit modal titles by form type (uses shared formType). */
export const HABIT_MODAL_TITLES: Record<TFormType, string> = {
  [formTypeEnumObject.create]: 'Crear nuevo hábito',
  [formTypeEnumObject.edit]: 'Editar hábito',
  [formTypeEnumObject.view]: 'Ver hábito',
};

/** Habit modal submit button labels by form type. */
export const HABIT_SUBMIT_LABELS: Record<TFormType, string> = {
  [formTypeEnumObject.create]: 'Crear hábito',
  [formTypeEnumObject.edit]: 'Guardar cambios',
  [formTypeEnumObject.view]: 'Cerrar',
};

/** Today summary widget: progress line. */
export const TODAY_SUMMARY_LINE = (completed: number, total: number) =>
  `${completed} de ${total} hábitos completados`;
