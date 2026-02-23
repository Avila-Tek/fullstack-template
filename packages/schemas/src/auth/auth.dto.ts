import { getEnumObjectFromArray } from '@repo/utils';
import { z } from 'zod';
import { userSchema } from '../users/user.schema';

// Auth Search Params
export const authSearchParam = ['token_hash', 'type'] as const;
export type TAuthSearchParamEnum = (typeof authSearchParam)[number];
export const authSearchParamEnumObject =
  getEnumObjectFromArray(authSearchParam);

// Sign In Input
const signInInput = z.object({
  email: z.email(),
  password: z.string().min(8),
});

const signInResponse = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: z.object({
      user: userSchema,
      accessToken: z.string(),
      refreshToken: z.string(),
    }),
  }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export type TSignInInput = z.infer<typeof signInInput>;
export type TSignInResponse = z.infer<typeof signInResponse>;

// JWT User Payload
const jwtUserPayload = z.object({
  id: z.string(),
});

export type JwtUserPayload = z.infer<typeof jwtUserPayload>;

// Sign Up Input
const signUpInput = z.object({
  email: z.email(),
  password: z.string().min(8),
  rePassword: z.string().min(8),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
});

const signUpResponse = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: z.object({
      user: userSchema.nullable(),
      requiresEmailConfirmation: z.boolean(),
    }),
  }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export type TSignUpInput = z.infer<typeof signUpInput>;
export type TSignUpResponse = z.infer<typeof signUpResponse>;

// Email Callback Query
const emailCallbackQuery = z.object({
  token_hash: z.string(),
  type: z.string(),
});

export type TEmailCallbackQuery = z.infer<typeof emailCallbackQuery>;

// Email Callback Response
const emailCallbackResponse = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: z.object({
      user: userSchema,
      accessToken: z.string(),
      refreshToken: z.string(),
    }),
  }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export type TEmailCallbackResponse = z.infer<typeof emailCallbackResponse>;

// Send OTP Input
const sendOtpInput = z.object({
  email: z.email(),
});

export type TSendOtpInput = z.infer<typeof sendOtpInput>;

// Verify OTP Input
const verifyOtpInput = z.object({
  email: z.email(),
  otp: z.string().length(6),
});

export type TVerifyOtpInput = z.infer<typeof verifyOtpInput>;

// Verify OTP Response
const verifyOtpResponse = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: z.object({
      user: userSchema,
      accessToken: z.string(),
      refreshToken: z.string(),
    }),
  }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export type TVerifyOtpResponse = z.infer<typeof verifyOtpResponse>;

// Sign Out Input
const signOutInput = z.object({});

export type TSignOutInput = z.infer<typeof signOutInput>;

// Forgot Password Input
const forgotPasswordInput = z.object({
  email: z.email(),
});

export type TForgotPasswordInput = z.infer<typeof forgotPasswordInput>;

// Reset Password Input
const resetPasswordInput = z.object({
  email: z.email(),
  otp: z.string().length(6),
  newPassword: z.string().min(8),
});

export type TResetPasswordInput = z.infer<typeof resetPasswordInput>;

// Google OAuth Input
const googleAuthInput = z.object({
  callbackUrl: z.string().url().optional(),
});

export type TGoogleAuthInput = z.infer<typeof googleAuthInput>;

// Get Session Response (OAuth callback)
const getSessionResponse = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: z.object({
      user: userSchema,
      accessToken: z.string(),
      refreshToken: z.string(),
    }),
  }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export type TGetSessionResponse = z.infer<typeof getSessionResponse>;

// Current User Response (with subscription)
const currentUserResponse = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: userSchema,
  }),
  z.object({ success: z.literal(false), error: z.string() }),
]);

export type TCurrentUserResponse = z.infer<typeof currentUserResponse>;

export const authDTO = Object.freeze({
  // Sign In
  signInInput,
  signInResponse,
  jwtUserPayload,
  // Sign Up
  signUpInput,
  signUpResponse,
  // Email Callback
  emailCallbackQuery,
  emailCallbackResponse,
  // Send OTP
  sendOtpInput,
  // Verify OTP
  verifyOtpInput,
  verifyOtpResponse,
  // Sign Out
  signOutInput,
  // Current User
  currentUserResponse,
  // Forgot Password
  forgotPasswordInput,
  // Reset Password
  resetPasswordInput,
  // Google OAuth
  googleAuthInput,
  // Get Session (OAuth callback)
  getSessionResponse,
});
