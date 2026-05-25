import { HttpStatus } from '@nestjs/common';

const statusMap: Record<string, number> = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  AUTH_INVALID_CREDENTIALS:    HttpStatus.UNAUTHORIZED,          // 401
  AUTH_ACCOUNT_LOCKED:         HttpStatus.TOO_MANY_REQUESTS,     // 429
  AUTH_PASSWORD_REUSE:         HttpStatus.UNPROCESSABLE_ENTITY,  // 422
  AUTH_PASSWORD_POLICY_FAILED: HttpStatus.BAD_REQUEST,           // 400
  AUTH_SESSION_EXPIRED:        HttpStatus.UNAUTHORIZED,          // 401
  AUTH_SESSION_INVALIDATED:    HttpStatus.UNAUTHORIZED,          // 401
  AUTH_EMAIL_DELIVERY_FAILED:  HttpStatus.SERVICE_UNAVAILABLE,   // 503
  AUTH_2FA_LOCKED:             HttpStatus.TOO_MANY_REQUESTS,     // 429
  AUTH_FORBIDDEN:              HttpStatus.FORBIDDEN,             // 403
  AUTH_USER_NOT_FOUND:         HttpStatus.NOT_FOUND,             // 404
};

export function domainToHttpStatus(error: string): number {
  return statusMap[error] ?? HttpStatus.UNPROCESSABLE_ENTITY;
}
