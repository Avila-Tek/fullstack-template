import { z } from 'zod';

export const habitReminderSchema = z.object({
  enabled: z.boolean(),
  time: z
    .string()
    .regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Invalid time format. Must be HH:mm')
    .optional(),
});
export type THabitReminder = z.infer<typeof habitReminderSchema>;
