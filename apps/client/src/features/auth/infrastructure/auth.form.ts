import type { useTranslations } from 'next-intl';
import { z } from 'zod';

/**
 * Form DTOs for Auth feature
 *
 * This file contains:
 * - Zod schema factory functions (receive a `t` function, return schema with translated messages)
 * - Form types (inferred from base schemas)
 * - Default values factory functions
 *
 * NOTE: API input/output types come from @repo/schemas
 * These are UI-specific form types that may differ from API contracts
 * (e.g., confirmPassword field exists in form but not in API)
 */

export type TAuthTranslations = ReturnType<typeof useTranslations<'auth'>>;

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

export function buildLoginSchema(t: TAuthTranslations) {
  return z.object({
    email: z
      .string()
      .min(1, { message: t('validation.emailRequired') })
      .email({ message: t('validation.emailInvalid') }),
    password: z
      .string()
      .min(1, { message: t('validation.passwordRequired') })
      .min(8, { message: t('validation.passwordMin') }),
  });
}

export type TLoginForm = z.infer<ReturnType<typeof buildLoginSchema>>;

export function createLoginDefaultValues(
  partial?: Partial<TLoginForm>
): TLoginForm {
  return {
    email: partial?.email ?? '',
    password: partial?.password ?? '',
  };
}

// ---------------------------------------------------------------------------
// Sign up
// ---------------------------------------------------------------------------

function buildSignUpBaseSchema(t: TAuthTranslations) {
  return z.object({
    firstName: z.string().max(50, { message: t('validation.nameMax') }),
    lastName: z.string().max(50, { message: t('validation.nameMax') }),
    email: z
      .string()
      .min(1, { message: t('validation.emailRequired') })
      .email({ message: t('validation.emailInvalid') }),
    password: z.string().min(8, { message: t('validation.passwordMin') }),
    rePassword: z
      .string()
      .min(1, { message: t('validation.confirmPasswordRequired') }),
  });
}

export function buildSignUpSchema(t: TAuthTranslations) {
  return buildSignUpBaseSchema(t).superRefine((data, ctx) => {
    if (data.password !== data.rePassword) {
      ctx.addIssue({
        code: 'custom',
        message: t('validation.passwordsMismatch'),
        path: ['rePassword'],
      });
    }
  });
}

export type TSignUpForm = z.infer<ReturnType<typeof buildSignUpBaseSchema>>;

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

// ---------------------------------------------------------------------------
// Send OTP (forgot password)
// ---------------------------------------------------------------------------

export function buildForgotPasswordSchema(t: TAuthTranslations) {
  return z.object({
    email: z
      .string()
      .min(1, { message: t('validation.emailRequired') })
      .email({ message: t('validation.emailInvalid') }),
  });
}

export type TForgotPasswordForm = z.infer<
  ReturnType<typeof buildForgotPasswordSchema>
>;

export function createForgotPasswordDefaultValues(
  partial?: Partial<TForgotPasswordForm>
): TForgotPasswordForm {
  return {
    email: partial?.email ?? '',
  };
}

// Keep legacy alias for any callers that use the old name
export const buildSendOtpSchema = buildForgotPasswordSchema;
export type TSendOtpForm = TForgotPasswordForm;

export function createSendOtpDefaultValues(
  partial?: Partial<TSendOtpForm>
): TSendOtpForm {
  return createForgotPasswordDefaultValues(partial);
}

// ---------------------------------------------------------------------------
// OTP verification
// ---------------------------------------------------------------------------

export function buildOtpSchema(t: TAuthTranslations) {
  return z.object({
    otp: z.string().length(6, { message: t('validation.otpDigits') }),
  });
}

export type TOtpForm = z.infer<ReturnType<typeof buildOtpSchema>>;

export function createOtpDefaultValues(partial?: Partial<TOtpForm>): TOtpForm {
  return {
    otp: partial?.otp ?? '',
  };
}

// ---------------------------------------------------------------------------
// Verify OTP (with email)
// ---------------------------------------------------------------------------

export function buildVerifyOtpSchema(t: TAuthTranslations) {
  return z.object({
    email: z
      .string()
      .min(1, { message: t('validation.emailRequired') })
      .email({ message: t('validation.emailInvalid') }),
    otp: z.string().length(6, { message: t('validation.otpDigits') }),
  });
}

export type TVerifyOtpForm = z.infer<ReturnType<typeof buildVerifyOtpSchema>>;

export function createVerifyOtpDefaultValues(
  partial?: Partial<TVerifyOtpForm>
): TVerifyOtpForm {
  return {
    email: partial?.email ?? '',
    otp: partial?.otp ?? '',
  };
}

// ---------------------------------------------------------------------------
// Email callback (email verification links)
// ---------------------------------------------------------------------------

export function buildEmailCallbackSchema(t: TAuthTranslations) {
  return z.object({
    tokenHash: z.string().min(1, { message: t('validation.tokenRequired') }),
    type: z.string().min(1, { message: t('validation.typeRequired') }),
  });
}

export type TEmailCallbackForm = z.infer<
  ReturnType<typeof buildEmailCallbackSchema>
>;

export function createEmailCallbackDefaultValues(
  partial?: Partial<TEmailCallbackForm>
): TEmailCallbackForm {
  return {
    tokenHash: partial?.tokenHash ?? '',
    type: partial?.type ?? '',
  };
}

// ---------------------------------------------------------------------------
// Reset password
// ---------------------------------------------------------------------------

function buildResetPasswordBaseSchema(t: TAuthTranslations) {
  return z.object({
    email: z
      .string()
      .min(1, { message: t('validation.emailRequired') })
      .email({ message: t('validation.emailInvalid') }),
    otp: z.string().length(6, { message: t('validation.otpDigits') }),
    newPassword: z.string().min(8, { message: t('validation.passwordMin') }),
    confirmPassword: z
      .string()
      .min(1, { message: t('validation.confirmPasswordRequired') }),
  });
}

export function buildResetPasswordSchema(t: TAuthTranslations) {
  return buildResetPasswordBaseSchema(t).superRefine((data, ctx) => {
    if (data.newPassword !== data.confirmPassword) {
      ctx.addIssue({
        code: 'custom',
        message: t('validation.passwordsMismatch'),
        path: ['confirmPassword'],
      });
    }
  });
}

export type TResetPasswordForm = z.infer<
  ReturnType<typeof buildResetPasswordBaseSchema>
>;

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
