import type {
  TCreateHabitInput,
  TCreateHabitLogInput,
  TGetHabitsForDateQuery,
  THabit,
  THabitLog,
  THabitsForDateResponse,
  TUpdateHabitInput,
} from '@repo/schemas';
import type { Safe } from '@repo/utils';

export interface HabitsApi {
  getForDate(
    query: TGetHabitsForDateQuery
  ): Promise<Safe<THabitsForDateResponse>>;
  create(input: TCreateHabitInput): Promise<Safe<THabit>>;
  update(id: string, input: TUpdateHabitInput): Promise<Safe<THabit>>;
  pause(id: string): Promise<Safe<THabit>>;
  reactivate(id: string): Promise<Safe<THabit>>;
  block(id: string): Promise<Safe<THabit>>;
  unblock(id: string): Promise<Safe<THabit>>;
  delete(id: string): Promise<Safe<THabit>>;
}

export interface HabitLogsApi {
  upsert(input: TCreateHabitLogInput): Promise<Safe<THabitLog>>;
}

export type HabitsResponse<T> =
  | { success: true; data: T }
  | { success: false; error: string };
