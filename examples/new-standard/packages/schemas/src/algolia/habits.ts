import { z } from 'zod';
import {
  habitGoalSchema,
  habitReminderSchema,
  habitScheduleSchema,
  habitSchema,
  habitStatusSchema,
  timeOfDaySchema,
} from '../habits';
import { algoliaTimestampSchema } from './utils';

export const algoliaHabitRecordSchema = habitSchema
  .omit({
    id: true,
    schedule: true,
    goal: true,
    reminder: true,
    status: true,
    timeOfDay: true,
    startDate: true,
    endDate: true,
    createdAt: true,
    updatedAt: true,
  })
  .extend({
    objectID: z.string(),
    status: habitStatusSchema,
    timeOfDay: timeOfDaySchema,
    scheduleType: habitScheduleSchema.shape.type,
    scheduleDaysOfWeek: habitScheduleSchema.shape.daysOfWeek,
    scheduleWeeklyDay: habitScheduleSchema.shape.weeklyDay,
    goalUnit: habitGoalSchema.shape.unit,
    goalPeriod: habitGoalSchema.shape.period,
    goalTarget: habitGoalSchema.shape.target,
    reminderEnabled: habitReminderSchema.shape.enabled,
    reminderTime: habitReminderSchema.shape.time,
    startDate: algoliaTimestampSchema,
    endDate: algoliaTimestampSchema,
    createdAt: z.number(),
    updatedAt: z.number(),
  });

export type TAlgoliaHabitRecord = z.infer<typeof algoliaHabitRecordSchema>;
