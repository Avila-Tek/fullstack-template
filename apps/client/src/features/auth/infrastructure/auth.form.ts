import { z } from 'zod';

/**
 * Form DTOs for Auth feature
 *
 * This file contains:
 * - Zod schemas for form validation
 * - Form types (inferred from schemas)
 * - Default values factory functions
 *
 * NOTE: API input/output types come from @repo/schemas
 * These are UI-specific form types that may differ from API contracts
 * (e.g., confirmPassword field exists in form but not in API)
 */

/**
 * Shared field validations
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

/**
 * Login form
 */
export const loginFormDefinition = z.object({
  email: emailValidation,
  password: z.string().min(1, 'La contraseña es obligatoria'),
});

export type TLoginForm = z.infer<typeof loginFormDefinition>;

export function createLoginDefaultValues(
  partial?: Partial<TLoginForm>
): TLoginForm {
  return {
    email: partial?.email ?? '',
    password: partial?.password ?? '',
  };
}

/**
 * Sign up form
 */
const signUpBaseSchema = z.object({
  firstName: optionalNameValidation,
  lastName: optionalNameValidation,
  email: emailValidation,
  password: passwordValidation,
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
    firstName: partial?.firstName ?? '',
    lastName: partial?.lastName ?? '',
    email: partial?.email ?? '',
    password: partial?.password ?? '',
    rePassword: partial?.rePassword ?? '',
  };
}

/**
 * Send OTP form (for password recovery)
 */
export const sendOtpFormDefinition = z.object({
  email: emailValidation,
});

export type TSendOtpForm = z.infer<typeof sendOtpFormDefinition>;

export function createSendOtpDefaultValues(
  partial?: Partial<TSendOtpForm>
): TSendOtpForm {
  return {
    email: partial?.email ?? '',
  };
}

/**
 * OTP form (simple, only otp field)
 */
const otpValidation = z.string().length(6, 'El código debe tener 6 dígitos');

export const otpFormDefinition = z.object({
  otp: otpValidation,
});

export type TOtpForm = z.infer<typeof otpFormDefinition>;

export function createOtpDefaultValues(partial?: Partial<TOtpForm>): TOtpForm {
  return {
    otp: partial?.otp ?? '',
  };
}

/**
 * Verify OTP form (with email)
 */
export const verifyOtpFormDefinition = z.object({
  email: emailValidation,
  otp: otpValidation,
});

export type TVerifyOtpForm = z.infer<typeof verifyOtpFormDefinition>;

export function createVerifyOtpDefaultValues(
  partial?: Partial<TVerifyOtpForm>
): TVerifyOtpForm {
  return {
    email: partial?.email ?? '',
    otp: partial?.otp ?? '',
  };
}

/**
 * Email callback form (for email verification links)
 */
export const emailCallbackFormDefinition = z.object({
  tokenHash: z.string().min(1, 'Token requerido'),
  type: z.string().min(1, 'Tipo requerido'),
});

export type TEmailCallbackForm = z.infer<typeof emailCallbackFormDefinition>;

export function createEmailCallbackDefaultValues(
  partial?: Partial<TEmailCallbackForm>
): TEmailCallbackForm {
  return {
    tokenHash: partial?.tokenHash ?? '',
    type: partial?.type ?? '',
  };
}

/**
 * Forgot password form
 */
export const forgotPasswordFormDefinition = z.object({
  email: emailValidation,
});

export type TForgotPasswordForm = z.infer<typeof forgotPasswordFormDefinition>;

export function createForgotPasswordDefaultValues(
  partial?: Partial<TForgotPasswordForm>
): TForgotPasswordForm {
  return {
    email: partial?.email ?? '',
  };
}

/**
 * Reset password form
 */
const resetPasswordBaseSchema = z.object({
  email: emailValidation,
  otp: z.string().length(6, 'El código debe tener 6 dígitos'),
  newPassword: passwordValidation,
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
    email: partial?.email ?? '',
    otp: partial?.otp ?? '',
    newPassword: partial?.newPassword ?? '',
    confirmPassword: partial?.confirmPassword ?? '',
  };
}
