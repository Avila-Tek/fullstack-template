import { getEnumObjectFromArray } from '@repo/utils';
import { TTimeOfDayFilter } from './habit.constants';

export const goalPeriod = ['day', 'week'] as const;
export type TGoalPeriod = (typeof goalPeriod)[number];
export const goalPeriodEnumObject = getEnumObjectFromArray(goalPeriod);

export const timeOfDay = ['morning', 'afternoon', 'evening'] as const;
export type TTimeOfDay = (typeof timeOfDay)[number];
export const timeOfDayEnumObject = getEnumObjectFromArray(timeOfDay);

export const habitStatus = ['active', 'paused', 'blocked'] as const;
export type THabitStatus = (typeof habitStatus)[number];
export const habitStatusEnumObject = getEnumObjectFromArray(habitStatus);

export const scheduleType = ['daily', 'weekly', 'custom'] as const;
export type TScheduleType = (typeof scheduleType)[number];
export const scheduleTypeEnumObject = getEnumObjectFromArray(scheduleType);

export interface THabitSchedule {
  type: TScheduleType;
  daysOfWeek?: number[];
  weeklyDay?: number;
  weeklyFlexible?: boolean;
}

export interface THabitGoal {
  unit: string;
  period: TGoalPeriod;
  target: number;
}

export interface THabitReminder {
  enabled: boolean;
  time?: string;
}

export interface THabitProgress {
  unit: string;
  period: TGoalPeriod;
  target: number;
  current: number;
  completed: boolean;
}

export interface THabitWithProgress {
  id: string;
  name: string;
  description?: string;
  timeOfDay: TTimeOfDay;
  status: THabitStatus;
  startDate: string | null;
  endDate: string | null;
  progress: THabitProgress;
}

export interface THabitsForDateResponse {
  today: THabitWithProgress[];
  week: THabitWithProgress[];
}

export interface THabit {
  id: string;
  userId: string;
  name: string;
  description?: string;
  schedule: THabitSchedule;
  goal: THabitGoal;
  timeOfDay: TTimeOfDay;
  reminder: THabitReminder;
  status: THabitStatus;
  isActive: boolean;
  startDate: string | null;
  endDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
}

export interface Habit {
  id: string;
  name: string;
  description?: string;
  schedule: THabitSchedule;
  goal: THabitGoal;
  timeOfDay: TTimeOfDay;
  reminder: THabitReminder;
  status: THabitStatus;
  isActive: boolean;
  startDate: Date | null;
  endDate: Date | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface HabitWithProgress {
  id: string;
  name: string;
  description?: string;
  timeOfDay: TTimeOfDay;
  status: THabitStatus;
  startDate: Date | null;
  endDate: Date | null;
  progress: HabitProgress;
}

export interface HabitProgress {
  unit: string;
  period: TGoalPeriod;
  target: number;
  current: number;
  completed: boolean;
}

export interface HabitLog {
  id: string;
  habitId: string;
  logDate: Date | null;
  completed: boolean;
  completedAt: Date | null;
  value: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export interface HabitsForDate {
  today: HabitWithProgress[];
  week: HabitWithProgress[];
}

export type TimeOfDayFilter = TTimeOfDayFilter | TTimeOfDay;

export interface HabitFilters {
  date: Date;
  timeOfDay?: TTimeOfDay;
}
