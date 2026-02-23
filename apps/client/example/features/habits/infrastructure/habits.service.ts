import type {
  TCreateHabitInput,
  TCreateHabitLogInput,
  TGetHabitsForDateQuery,
  TUpdateHabitInput,
} from '@repo/schemas';
import type { Habit, HabitLog, HabitsForDate } from '../domain/habit.model';
import type { HabitLogsApi, HabitsApi } from './habits.interfaces';
import {
  toHabitDomain,
  toHabitLogDomain,
  toHabitsForDateDomain,
} from './habits.transform';

export class HabitsServiceClass {
  constructor(
    private habitsApi: HabitsApi,
    private habitLogsApi: HabitLogsApi
  ) {}

  async getHabitsForDate(
    query: TGetHabitsForDateQuery
  ): Promise<HabitsForDate> {
    const result = await this.habitsApi.getForDate(query);
    if (!result.success) {
      throw new Error(result.error);
    }
    return toHabitsForDateDomain(result.data);
  }

  async createHabit(input: TCreateHabitInput): Promise<Habit> {
    const result = await this.habitsApi.create(input);
    if (!result.success) {
      throw new Error(result.error);
    }
    return toHabitDomain(result.data);
  }

  async updateHabit(id: string, input: TUpdateHabitInput): Promise<Habit> {
    const result = await this.habitsApi.update(id, input);
    if (!result.success) {
      throw new Error(result.error);
    }
    return toHabitDomain(result.data);
  }

  async pauseHabit(id: string): Promise<Habit> {
    const result = await this.habitsApi.pause(id);
    if (!result.success) {
      throw new Error(result.error);
    }
    return toHabitDomain(result.data);
  }

  async reactivateHabit(id: string): Promise<Habit> {
    const result = await this.habitsApi.reactivate(id);
    if (!result.success) {
      throw new Error(result.error);
    }
    return toHabitDomain(result.data);
  }

  async blockHabit(id: string): Promise<Habit> {
    const result = await this.habitsApi.block(id);
    if (!result.success) {
      throw new Error(result.error);
    }
    return toHabitDomain(result.data);
  }

  async unblockHabit(id: string): Promise<Habit> {
    const result = await this.habitsApi.unblock(id);
    if (!result.success) {
      throw new Error(result.error);
    }
    return toHabitDomain(result.data);
  }

  async deleteHabit(id: string): Promise<Habit> {
    const result = await this.habitsApi.delete(id);
    if (!result.success) {
      throw new Error(result.error);
    }
    return toHabitDomain(result.data);
  }

  async logProgress(input: TCreateHabitLogInput): Promise<HabitLog> {
    const result = await this.habitLogsApi.upsert(input);
    if (!result.success) {
      throw new Error(result.error);
    }
    return toHabitLogDomain(result.data);
  }
}
