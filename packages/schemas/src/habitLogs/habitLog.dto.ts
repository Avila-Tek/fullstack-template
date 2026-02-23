import { z } from 'zod';
import { buildSafeResponseSchema } from '../utils';
import { habitLogSchema, habitLogsSchema } from './habitLog.schema';

export const habitLogIdParamsSchema = z.object({
  id: z.uuid(),
});
export type THabitLogIdParams = z.infer<typeof habitLogIdParamsSchema>;

export type THabitLogResponse = z.output<typeof habitLogSchema>;

export const habitLogResponseSchema = buildSafeResponseSchema(habitLogSchema);
export type TSafeHabitLogResponse = z.output<typeof habitLogResponseSchema>;

export const habitLogsResponseSchema = buildSafeResponseSchema(habitLogsSchema);
export type TSafeHabitLogsResponse = z.output<typeof habitLogsResponseSchema>;

export const createHabitLogInput = z.object({
  habitId: z.uuid(),
  logDate: z.coerce.date(),
  value: z.number().int().min(0).default(1),
});
export type TCreateHabitLogInput = z.infer<typeof createHabitLogInput>;

export const findHabitLogsQuery = z.object({
  habitId: z.uuid().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});
export type TFindHabitLogsQuery = z.infer<typeof findHabitLogsQuery>;
