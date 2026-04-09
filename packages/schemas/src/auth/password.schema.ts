import { z } from 'zod';

export type PasswordRuleKey =
  | 'IDENTITY_PASSWORD_MIN_LENGTH'
  | 'IDENTITY_PASSWORD_MISSING_UPPERCASE'
  | 'IDENTITY_PASSWORD_MISSING_LOWERCASE'
  | 'IDENTITY_PASSWORD_MISSING_DIGIT'
  | 'IDENTITY_PASSWORD_MISSING_SPECIAL';

// Individual rules — shared by the frontend checklist and the backend domain VO.
// Keep in sync with passwordComplexitySchema below.
export const PASSWORD_RULES: ReadonlyArray<{
  readonly key: PasswordRuleKey;
  readonly test: (value: string) => boolean;
}> = [
  { key: 'IDENTITY_PASSWORD_MIN_LENGTH', test: (v) => v.length >= 8 },
  { key: 'IDENTITY_PASSWORD_MISSING_UPPERCASE', test: (v) => /[A-Z]/.test(v) },
  { key: 'IDENTITY_PASSWORD_MISSING_LOWERCASE', test: (v) => /[a-z]/.test(v) },
  { key: 'IDENTITY_PASSWORD_MISSING_DIGIT', test: (v) => /\d/.test(v) },
  { key: 'IDENTITY_PASSWORD_MISSING_SPECIAL', test: (v) => /[^A-Za-z0-9]/.test(v) },
];

// Zod schema — messages are i18n keys so both the backend filter
// and frontend checklist can resolve them in the right language.
export const passwordComplexitySchema = z
  .string()
  .min(8, 'IDENTITY_PASSWORD_MIN_LENGTH')
  .regex(/[A-Z]/, 'IDENTITY_PASSWORD_MISSING_UPPERCASE')
  .regex(/[a-z]/, 'IDENTITY_PASSWORD_MISSING_LOWERCASE')
  .regex(/\d/, 'IDENTITY_PASSWORD_MISSING_DIGIT')
  .regex(/[^A-Za-z0-9]/, 'IDENTITY_PASSWORD_MISSING_SPECIAL');
