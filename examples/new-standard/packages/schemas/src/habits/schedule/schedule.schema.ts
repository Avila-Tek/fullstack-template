import { z } from 'zod';

export const SCHEDULE_TYPE = {
  DAILY: 'daily',
  WEEKLY: 'weekly',
  CUSTOM: 'custom',
} as const;

export const scheduleTypeValues = Object.values(SCHEDULE_TYPE);
export const scheduleTypeSchema = z.enum(['daily', 'weekly', 'custom']);
export type TScheduleType = z.infer<typeof scheduleTypeSchema>;

export const habitScheduleSchema = z.object({
  type: scheduleTypeSchema,
  daysOfWeek: z.array(z.number().min(0).max(6)).optional(),
  weeklyDay: z.number().min(0).max(6).optional(),
  weeklyFlexible: z.boolean().default(false),
});
export type THabitSchedule = z.infer<typeof habitScheduleSchema>;
