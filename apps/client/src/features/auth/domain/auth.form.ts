import { z } from 'zod';

/**
 * Form DTOs for Auth feature
 *
 * Zod schemas for form validation and inferred form types.
 * These are UI-specific shapes (may include confirmPassword, etc.)
 * that differ from the service input types.
 */

const emailValidation = z
  .string()
  .min(1, 'El correo es obligatorio')
  .email('Por favor ingresa un correo válido');

const passwordValidation = z
  .string()
  .min(8, 'La contraseña debe tener al menos 8 caracteres');

const optionalNameValidation = z
  .string()
  .max(50, 'El nombre debe tener menos de 50 caracteres');

// ── Login ──────────────────────────────────────────────────────────────────

export const loginFormDefinition = z.object({
  email:    emailValidation,
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export type TLoginForm = z.infer<typeof loginFormDefinition>;

export function createLoginDefaultValues(
  partial?: Partial<TLoginForm>
): TLoginForm {
  return {
    email:    partial?.email    ?? '',
    password: partial?.password ?? '',
  };
}

// ── Sign Up ────────────────────────────────────────────────────────────────

const signUpBaseSchema = z.object({
  firstName:  optionalNameValidation,
  lastName:   optionalNameValidation,
  email:      emailValidation,
  password:   passwordValidation,
  rePassword: z.string().min(1, 'Por favor confirma tu contraseña'),
});

export const signUpFormDefinition = signUpBaseSchema.superRefine(
  (data, ctx) => {
    if (data.password !== data.rePassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Las contraseñas no coinciden',
        path: ['rePassword'],
      });
    }
  }
);

export type TSignUpForm = z.infer<typeof signUpBaseSchema>;

export function createSignUpDefaultValues(
  partial?: Partial<TSignUpForm>
): TSignUpForm {
  return {
    firstName:  partial?.firstName  ?? '',
    lastName:   partial?.lastName   ?? '',
    email:      partial?.email      ?? '',
    password:   partial?.password   ?? '',
    rePassword: partial?.rePassword ?? '',
  };
}

// ── Forgot Password ────────────────────────────────────────────────────────

export const forgotPasswordFormDefinition = z.object({
  email: emailValidation,
});

export type TForgotPasswordForm = z.infer<typeof forgotPasswordFormDefinition>;

export function createForgotPasswordDefaultValues(
  partial?: Partial<TForgotPasswordForm>
): TForgotPasswordForm {
  return { email: partial?.email ?? '' };
}

// ── Reset Password (BA token-link flow) ────────────────────────────────────
// Token comes from URL params — form only needs the new password fields.

const resetPasswordBaseSchema = z.object({
  newPassword:     passwordValidation,
  confirmPassword: z.string().min(1, 'Por favor confirma tu contraseña'),
});

export const resetPasswordFormDefinition = resetPasswordBaseSchema.superRefine(
  (data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: 'Las contraseñas no coinciden',
        path: ['confirmPassword'],
      });
    }
  }
);

export type TResetPasswordForm = z.infer<typeof resetPasswordBaseSchema>;

export function createResetPasswordDefaultValues(
  partial?: Partial<TResetPasswordForm>
): TResetPasswordForm {
  return {
    newPassword:     partial?.newPassword     ?? '',
    confirmPassword: partial?.confirmPassword ?? '',
  };
}
