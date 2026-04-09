import { z } from 'zod';

// Shared email validation regex — used in form validation (.refine) and domain value objects.
export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Email validation schema — shared by frontend forms and backend domain validation.
export const emailSchema = z.string().refine((v) => EMAIL_REGEX.test(v), {
  message: 'Invalid email address',
});
