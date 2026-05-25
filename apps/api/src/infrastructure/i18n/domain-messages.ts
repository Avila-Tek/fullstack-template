const messages: Record<string, string> = {
  // ── Auth ─────────────────────────────────────────────────────────────────
  AUTH_INVALID_CREDENTIALS:    'Invalid email or password',
  AUTH_ACCOUNT_LOCKED:         'Account temporarily locked due to too many failed attempts',
  AUTH_PASSWORD_REUSE:         'Password has been used recently. Please choose a different password',
  AUTH_PASSWORD_POLICY_FAILED: 'Password does not meet complexity requirements',
  AUTH_SESSION_EXPIRED:        'Your session has expired due to inactivity. Please sign in again',
  AUTH_SESSION_INVALIDATED:    'Your session has been invalidated. Please sign in again',
  AUTH_EMAIL_DELIVERY_FAILED:  'Failed to send email. Please try again later',
  AUTH_2FA_LOCKED:             'Too many 2FA attempts. Please wait before trying again',
  AUTH_FORBIDDEN:              'You do not have permission to perform this action',
  AUTH_USER_NOT_FOUND:         'User not found',
};

export function domainErrorMessage(error: string): string {
  return messages[error] ?? error;
}
