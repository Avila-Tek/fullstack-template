import { z } from 'zod';
import { zDateToIsoNullableOpt } from '../utils';

export const habitLogSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  habitId: z.uuid(),
  logDate: zDateToIsoNullableOpt,
  completed: z.boolean(),
  completedAt: zDateToIsoNullableOpt,
  value: z.number().int().min(0),
  createdAt: zDateToIsoNullableOpt,
  updatedAt: zDateToIsoNullableOpt,
});

export type THabitLog = z.output<typeof habitLogSchema>;
export const habitLogsSchema = z.array(habitLogSchema);
export type THabitLogList = z.output<typeof habitLogsSchema>;
