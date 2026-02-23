import { z } from 'zod';

export const TIME_OF_DAY = {
  MORNING: 'morning',
  AFTERNOON: 'afternoon',
  EVENING: 'evening',
} as const;

export const timeOfDayValues = Object.values(TIME_OF_DAY);
export const timeOfDaySchema = z.enum(['morning', 'afternoon', 'evening']);
export type TTimeOfDay = z.infer<typeof timeOfDaySchema>;
