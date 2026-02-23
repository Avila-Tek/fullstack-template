import { z } from 'zod';
import { zDateToIsoNullableOpt } from '../utils';
import { habitGoalSchema } from './goal';
import { habitReminderSchema } from './reminder';
import { habitScheduleSchema } from './schedule';
import { habitStatusSchema } from './status';
import { timeOfDaySchema } from './timeOfDay';

export const habitSchema = z.object({
  id: z.uuid(),
  userId: z.uuid(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).optional(),
  schedule: habitScheduleSchema,
  goal: habitGoalSchema,
  timeOfDay: timeOfDaySchema,
  reminder: habitReminderSchema,
  status: habitStatusSchema,
  isActive: z.boolean(),
  startDate: zDateToIsoNullableOpt,
  endDate: zDateToIsoNullableOpt,
  createdAt: zDateToIsoNullableOpt,
  updatedAt: zDateToIsoNullableOpt,
});

export type THabit = z.output<typeof habitSchema>;
export const habitsSchema = z.array(habitSchema);
export type THabitList = z.output<typeof habitsSchema>;
