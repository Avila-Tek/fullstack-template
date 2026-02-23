import { getEnumObjectFromArray } from '@repo/utils';
import type { Session } from './auth.model';

/**
 * Check if session exists and has valid structure
 * Note: Token expiration is validated server-side
 */
export function isSessionValid(session: Session | null): session is Session {
  if (!session) return false;
  return !!session.accessToken && !!session.user;
}

/**
 * Password strength levels
 */
export const passwordStrength = ['weak', 'fair', 'good', 'strong'] as const;
export type TPasswordStrength = (typeof passwordStrength)[number];
export const passwordStrengthEnumObject =
  getEnumObjectFromArray(passwordStrength);

/**
 * Evaluates password strength based on:
 * - Minimum length (8 characters)
 * - Mixed case (lowercase + uppercase)
 * - Contains numbers
 * - Contains special characters
 */
export function evaluatePasswordStrength(password: string): {
  strength: TPasswordStrength;
  score: number;
} {
  let score = 0;

  if (password.length >= 8) score++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^a-zA-Z0-9]/.test(password)) score++;

  if (score <= 1) return { strength: passwordStrengthEnumObject.weak, score };
  if (score === 2) return { strength: passwordStrengthEnumObject.fair, score };
  if (score === 3) return { strength: passwordStrengthEnumObject.good, score };
  return { strength: passwordStrengthEnumObject.strong, score };
}
