import { z } from 'zod';

export const HABIT_STATUS = {
  ACTIVE: 'active',
  PAUSED: 'paused',
  BLOCKED: 'blocked',
} as const;

export const habitStatusValues = Object.values(HABIT_STATUS);
export const habitStatusSchema = z.enum(['active', 'paused', 'blocked']);
export type THabitStatus = z.infer<typeof habitStatusSchema>;
