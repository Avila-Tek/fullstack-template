import { z } from 'zod';

export const GOAL_PERIOD = {
  DAY: 'day',
  WEEK: 'week',
} as const;

export const goalPeriodValues = Object.values(GOAL_PERIOD);
export const goalPeriodSchema = z.enum(goalPeriodValues);
export type TGoalPeriod = z.infer<typeof goalPeriodSchema>;

export const habitGoalSchema = z.object({
  unit: z.string().min(1),
  period: goalPeriodSchema,
  target: z.number().int().positive(),
});
export type THabitGoal = z.infer<typeof habitGoalSchema>;
