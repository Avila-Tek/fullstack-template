import type { TEmailCallbackQuery, TResetPasswordInput } from '@repo/schemas';
import type {
  TEmailCallbackForm,
  TResetPasswordForm,
} from '../domain/auth.form';
import type { Session, SignUpResult, User } from '../domain/auth.model';
import type {
  AuthSessionDto,
  AuthUserDto,
  SignUpResultDto,
} from './auth.interfaces';

/**
 * Transforms a User DTO from the API to the domain model
 */
export function toUserDomain(dto: AuthUserDto): User {
  return {
    id: dto.id,
    email: dto.email,
    firstName: dto.firstName,
    lastName: dto.lastName,
    timezone: dto.timezone,
    status: dto.status,
    createdAt: dto.createdAt ? new Date(dto.createdAt) : new Date(),
    updatedAt: dto.updatedAt ? new Date(dto.updatedAt) : new Date(),
  };
}

/**
 * Transforms a Session DTO from the API to the domain model
 */
export function toSessionDomain(dto: AuthSessionDto): Session {
  return {
    user: toUserDomain(dto.user),
    accessToken: dto.accessToken,
    refreshToken: dto.refreshToken,
  };
}

/**
 * Transforms a SignUp result DTO from the API to the domain model
 */
export function toSignUpResultDomain(dto: SignUpResultDto): SignUpResult {
  return {
    user: dto.user ? toUserDomain(dto.user) : null,
    requiresEmailConfirmation: dto.requiresEmailConfirmation,
  };
}

/**
 * Transforms form data to API query (tokenHash → token_hash)
 */
export function toEmailCallbackQuery(
  form: TEmailCallbackForm
): TEmailCallbackQuery {
  return {
    token_hash: form.tokenHash,
    type: form.type,
  };
}

/**
 * Transforms form data to API input (removes confirmPassword)
 */
export function toResetPasswordInput(
  form: TResetPasswordForm
): TResetPasswordInput {
  return {
    email: form.email,
    otp: form.otp,
    newPassword: form.newPassword,
  };
}
