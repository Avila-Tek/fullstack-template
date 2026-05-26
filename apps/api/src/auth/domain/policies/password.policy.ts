import { PasswordPolicyFailedException } from '../exceptions/password-policy-failed.exception.js';

const MIN_LENGTH = 8;
const MAX_LENGTH = 128;

export const PasswordPolicy = {
  MIN_LENGTH,
  MAX_LENGTH,

  validate(password: string): void {
    const violations: string[] = [];

    if (password !== password.trim()) {
      violations.push('Password must not have leading or trailing spaces');
    }
    if (password.length < MIN_LENGTH) {
      violations.push(`Password must be at least ${MIN_LENGTH} characters`);
    }
    if (password.length > MAX_LENGTH) {
      violations.push(`Password must be at most ${MAX_LENGTH} characters`);
    }
    if (!/[A-Z]/.test(password)) {
      violations.push('Password must contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
      violations.push('Password must contain at least one lowercase letter');
    }
    if (!/[0-9]/.test(password)) {
      violations.push('Password must contain at least one digit');
    }
    if (!/[^A-Za-z0-9]/.test(password)) {
      violations.push('Password must contain at least one special character');
    }

    if (violations.length > 0) {
      throw new PasswordPolicyFailedException(violations);
    }
  },
} as const;
