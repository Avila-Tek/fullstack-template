import { z } from 'zod';
import { buildSafeResponseSchema } from '../utils';
import { goalPeriodSchema, habitGoalSchema } from './goal';
import { habitSchema, habitsSchema } from './habit.schema';
import { habitReminderSchema } from './reminder';
import { habitScheduleSchema } from './schedule';
import { habitStatusSchema } from './status';
import { timeOfDaySchema } from './timeOfDay';

export const habitIdParamsSchema = z.object({
  id: z.uuid(),
});
export type THabitIdParams = z.infer<typeof habitIdParamsSchema>;

export type THabitResponse = z.output<typeof habitSchema>;

export const habitResponseSchema = buildSafeResponseSchema(habitSchema);
export type TSafeHabitResponse = z.output<typeof habitResponseSchema>;

export const habitsResponseSchema = buildSafeResponseSchema(habitsSchema);
export type TSafeHabitsResponse = z.output<typeof habitsResponseSchema>;

export const createHabitInput = z.object({
  name: z.string().min(1, 'Name is required').max(255),
  description: z.string().max(1000).optional(),
  schedule: habitScheduleSchema,
  goal: habitGoalSchema,
  timeOfDay: timeOfDaySchema,
  reminder: habitReminderSchema,
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type TCreateHabitInput = z.infer<typeof createHabitInput>;

export const updateHabitInput = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  schedule: habitScheduleSchema.optional(),
  goal: habitGoalSchema.optional(),
  timeOfDay: timeOfDaySchema.optional(),
  reminder: habitReminderSchema.optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
});
export type TUpdateHabitInput = z.infer<typeof updateHabitInput>;

export const getHabitsForDateQuerySchema = z.object({
  date: z.coerce.date(),
  timeOfDay: timeOfDaySchema.optional(),
  day: z.coerce.number().int().min(0).max(6).optional(),
  completed: z
    .union([z.string(), z.boolean()])
    .transform((val) => {
      if (typeof val === 'boolean') return val;
      if (val === 'true') return true;
      if (val === 'false') return false;
      return undefined;
    })
    .optional(),
  status: habitStatusSchema.optional(),
});
export type TGetHabitsForDateQuery = z.infer<
  typeof getHabitsForDateQuerySchema
>;

export const habitProgressSchema = z.object({
  unit: z.string(),
  period: goalPeriodSchema,
  target: z.number().int().positive(),
  current: z.number().int().min(0),
  completed: z.boolean(),
});
export type THabitProgress = z.infer<typeof habitProgressSchema>;

export const habitWithProgressSchema = habitSchema
  .pick({
    id: true,
    timeOfDay: true,
    status: true,
    startDate: true,
    endDate: true,
  })
  .extend({
    progress: habitProgressSchema,
  });
export type THabitWithProgress = z.infer<typeof habitWithProgressSchema>;

export const habitsForDateResponseSchema = z.object({
  today: z.array(habitWithProgressSchema),
  week: z.array(habitWithProgressSchema),
});
export type THabitsForDateResponse = z.infer<
  typeof habitsForDateResponseSchema
>;

export const safeHabitsForDateResponseSchema = buildSafeResponseSchema(
  habitsForDateResponseSchema
);
export type TSafeHabitsForDateResponse = z.infer<
  typeof safeHabitsForDateResponseSchema
>;
