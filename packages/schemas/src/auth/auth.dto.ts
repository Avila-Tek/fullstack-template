import { z } from 'zod';
import { passwordComplexitySchema } from '../users/user.dto';
import { userSchema } from '../users/user.schema';

// ---------------------------------------------------------------------------
// Login DTO
// ---------------------------------------------------------------------------

export const loginInput = z.object({
  email: z.email(),
  password: z.string().min(1),
  captchaToken: z.string().min(1),
});

export type TLoginInput = z.infer<typeof loginInput>;

// ---------------------------------------------------------------------------
// Sign-up DTO — consumed by apps/auth hooks and apps/client use case
// ---------------------------------------------------------------------------

export const signUpInput = z.object({
  // Better-auth fields
  name: z.string(),
  email: z.email().max(254),
  password: passwordComplexitySchema,
  callbackURL: z.url().optional(),
  // Additional fields
  captchaToken: z.string().min(1),
  captchaVersion: z.enum(['v2', 'v3']).default('v3'),
  termsAccepted: z.literal(true),
  systemTermsId: z.uuid(),
});

export type TSignUpInput = z.infer<typeof signUpInput>;

// ---------------------------------------------------------------------------
// Resend verification email DTO
// ---------------------------------------------------------------------------

export const resendVerificationEmailInput = z.object({
  email: z.email(),
  callbackURL: z.url().optional(),
});

export type TResendVerificationEmailInput = z.infer<
  typeof resendVerificationEmailInput
>;

// ---------------------------------------------------------------------------
// Better Auth — session shape (entity schema)
// ---------------------------------------------------------------------------

export const betterAuthSessionSchema = z.object({
  id: z.string(),
  userId: z.uuid(),
  token: z.string(),
  expiresAt: z.iso.datetime(),
  ipAddress: z.string().nullable(),
  userAgent: z.string().nullable(),
});

export type TBetterAuthSession = z.infer<typeof betterAuthSessionSchema>;

export const getSessionResponse = z.object({
  user: userSchema,
  session: betterAuthSessionSchema,
});

export type TGetSessionResponse = z.infer<typeof getSessionResponse>;

// ---------------------------------------------------------------------------
// Better Auth — sign-out / verification
// ---------------------------------------------------------------------------

export const signOutResponse = z.object({ success: z.boolean() });

export const verificationResultResponse = z.object({ success: z.boolean() });

// ---------------------------------------------------------------------------
// Better Auth — password reset
// ---------------------------------------------------------------------------

export const forgetPasswordInput = z.object({
  email: z.email(),
  redirectTo: z.url().optional(),
  captchaToken: z.string().min(1),
  captchaVersion: z.enum(['v2', 'v3']).default('v3'),
});

export type TForgetPasswordInput = z.infer<typeof forgetPasswordInput>;

export const resetPasswordInput = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8),
});

export type TResetPasswordInput = z.infer<typeof resetPasswordInput>;

// ---------------------------------------------------------------------------
// Better Auth — token / JWKS
// ---------------------------------------------------------------------------

export const tokenResponse = z.object({ token: z.string() });

// ---------------------------------------------------------------------------
// Better Auth — OAuth
// ---------------------------------------------------------------------------

export const socialSignInInput = z.object({
  provider: z.enum(['google', 'facebook']),
  callbackURL: z.url(),
  additionalData: z.object({
    captchaToken: z.string(),
    captchaVersion: z.string(),
    systemTermsId: z.string(),
  }),
});

export type TSocialSignInInput = z.infer<typeof socialSignInInput>;

export const socialSignInResponse = z.object({ url: z.url() });

// ---------------------------------------------------------------------------
// Better Auth — Two-Factor
// ---------------------------------------------------------------------------

export const totpVerifyInput = z.object({ code: z.string().length(6) });

export type TTotpVerifyInput = z.infer<typeof totpVerifyInput>;

export const enableTotpInput = z.object({
  password: z.string().min(1).optional(),
  issuer: z.string().optional(),
});

export type TEnableTotpInput = z.infer<typeof enableTotpInput>;

export const disableTotpInput = z.object({ password: z.string().min(1) });

export type TDisableTotpInput = z.infer<typeof disableTotpInput>;

export const enableTotpResponse = z.object({
  qrCodeUri: z.string(),
  secret: z.string(),
});

export const backupCodesResponse = z.object({
  backupCodes: z.array(z.string()),
});

export const sendOtpInput = z.object({
  // 'email' (default) — sends OTP to the user's verified email address.
  // 'sms' — sends OTP to the user's verified phone number.
  //   Requires the user to have completed phone verification via
  //   /phone-number/send-otp → /phone-number/verify before calling this.
  method: z.enum(['email', 'sms']).optional().default('email'),
  trustDevice: z.boolean().optional(),
});

export const sendOtpResponse = z.object({ status: z.boolean() });

export const verifyOtpInput = z.object({
  code: z.string(),
  trustDevice: z.boolean().optional(),
});

export const getTotpUriInput = z.object({
  password: z.string().optional(),
});

export const getTotpUriResponse = z.object({ totpURI: z.string() });

// ---------------------------------------------------------------------------
// Better Auth hook — password change
// ---------------------------------------------------------------------------

export const changePasswordInput = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8),
});

export type TChangePasswordInput = z.infer<typeof changePasswordInput>;

// ---------------------------------------------------------------------------
// Better Auth hook — email change
// ---------------------------------------------------------------------------

export const changeEmailInput = z.object({
  currentPassword: z.string().min(1),
  newEmail: z.email().max(254),
  callbackURL: z.url().optional(),
});

export type TChangeEmailInput = z.infer<typeof changeEmailInput>;

export const changeEmailPendingResponse = z.object({
  hasPending: z.boolean(),
  newEmail: z.string().optional(),
});

export type TChangeEmailPendingResponse = z.infer<
  typeof changeEmailPendingResponse
>;

// ---------------------------------------------------------------------------
// Better Auth phoneNumber plugin — phone verification flow
// ---------------------------------------------------------------------------

// Venezuelan local format: 04XX-NNNNNNN (11 digits, starts with 04)
export const venezuelanPhone = z
  .string()
  .regex(
    /^04\d{9}$/,
    'Invalid Venezuelan phone number (expected format: 04XXXXXXXXX)'
  );

export const phoneNumberSendOtpInput = z.object({
  phoneNumber: venezuelanPhone,
});

export const phoneNumberVerifyInput = z.object({
  phoneNumber: venezuelanPhone,
  code: z.string().length(6),
  updatePhoneNumber: z.boolean().optional(),
  disableSession: z.boolean().optional(),
});

export const phoneNumberVerifyResponse = z.object({
  status: z.literal(true),
  token: z.string().nullable(),
});

// ---------------------------------------------------------------------------
// Custom NestJS endpoints — active terms response
// ---------------------------------------------------------------------------

export const activeTermsResponse = z.object({
  id: z.string().uuid(),
  version: z.string(),
  title: z.string(),
  content: z.string(),
  effectiveAt: z.date(),
});

export type TActiveTermsResponse = z.infer<typeof activeTermsResponse>;
