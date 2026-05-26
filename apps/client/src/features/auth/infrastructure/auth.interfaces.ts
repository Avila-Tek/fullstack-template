/**
 * Re-exports auth input/output types from @repo/schemas.
 *
 * All endpoint shapes (wire format) live in packages/schemas — this file
 * simply surfaces them as named imports for the infrastructure layer.
 */
export type {
  TBetterAuthSession as BetterAuthSession,
  TBetterAuthUser as BetterAuthUser,
  TForgotPasswordInput as ForgetPasswordInput,
  TGetSessionResponse as BetterAuthSessionResponse,
  TResetPasswordInput as ResetPasswordInput,
  TSendVerificationEmailInput as SendVerificationEmailInput,
  TSignInEmailInput as SignInInput,
  TSignInSocialInput as SignInSocialInput,
  TSignUpEmailInput as SignUpInput,
  TSignUpResult as SignUpResult,
  TVerifyEmailInput as VerifyEmailInput,
} from '@repo/schemas';
