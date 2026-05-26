import { z } from 'zod';
import { buildSafeResponseSchema } from '../utils';
import { userSchema, usersSchema } from './user.schema';

// ---------------------------------------------------------------------------
// Password complexity — single source of truth for all apps
// ---------------------------------------------------------------------------

export const PASSWORD_CONSTRAINTS = {
  MIN_LENGTH: 8,
  MAX_LENGTH: 32,
  UPPERCASE_REGEX: /[A-Z]/,
  LOWERCASE_REGEX: /[a-z]/,
  DIGIT_REGEX: /\d/,
  SYMBOL_REGEX: /[^A-Za-z0-9]/,
} as const;

export interface PasswordSchemaMessages {
  minLength?: string;
  maxLength?: string;
  uppercase?: string;
  lowercase?: string;
  digit?: string;
  symbol?: string;
}

export function buildPasswordSchema(messages?: PasswordSchemaMessages) {
  return z
    .string()
    .min(
      PASSWORD_CONSTRAINTS.MIN_LENGTH,
      messages?.minLength ??
        `Password must be at least ${PASSWORD_CONSTRAINTS.MIN_LENGTH} characters`
    )
    .max(
      PASSWORD_CONSTRAINTS.MAX_LENGTH,
      messages?.maxLength ??
        `Password must not exceed ${PASSWORD_CONSTRAINTS.MAX_LENGTH} characters`
    )
    .regex(
      PASSWORD_CONSTRAINTS.UPPERCASE_REGEX,
      messages?.uppercase ??
        'Password must contain at least one uppercase letter'
    )
    .regex(
      PASSWORD_CONSTRAINTS.LOWERCASE_REGEX,
      messages?.lowercase ??
        'Password must contain at least one lowercase letter'
    )
    .regex(
      PASSWORD_CONSTRAINTS.DIGIT_REGEX,
      messages?.digit ?? 'Password must contain at least one digit'
    )
    .regex(
      PASSWORD_CONSTRAINTS.SYMBOL_REGEX,
      messages?.symbol ?? 'Password must contain at least one special character'
    );
}

export const passwordComplexitySchema = buildPasswordSchema();

// ---------------------------------------------------------------------------
// User ID params (route param)
// ---------------------------------------------------------------------------

export const userIdInput = z.object({
  id: z.uuid(),
});
export type TUserIdInput = z.infer<typeof userIdInput>;

// ---------------------------------------------------------------------------
// Safe wrapped responses
// ---------------------------------------------------------------------------

export const userResponse = buildSafeResponseSchema(userSchema);
export type TUserResponse = z.output<typeof userResponse>;

export const usersResponse = buildSafeResponseSchema(usersSchema);
export type TUsersResponse = z.output<typeof usersResponse>;

// ---------------------------------------------------------------------------
// Create / update user
// ---------------------------------------------------------------------------

export const createUserInput = z.object({
  email: z.email(),
  password: passwordComplexitySchema,
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

export type TCreateUserInput = z.infer<typeof createUserInput>;

export const updateUserInput = userSchema
  .omit({ id: true, createdAt: true, updatedAt: true })
  .partial();

export type TUpdateUserInput = z.infer<typeof updateUserInput>;
