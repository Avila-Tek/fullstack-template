import type { Locale } from './locale.js';

const messages: Record<Locale, Record<string, string>> = {
  en: {
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
  },
  es: {
    AUTH_INVALID_CREDENTIALS:    'Email o contraseña incorrectos',
    AUTH_ACCOUNT_LOCKED:         'Cuenta bloqueada temporalmente por demasiados intentos fallidos',
    AUTH_PASSWORD_REUSE:         'La contraseña fue usada recientemente. Por favor elige una diferente',
    AUTH_PASSWORD_POLICY_FAILED: 'La contraseña no cumple los requisitos de seguridad',
    AUTH_SESSION_EXPIRED:        'Tu sesión expiró por inactividad. Por favor inicia sesión de nuevo',
    AUTH_SESSION_INVALIDATED:    'Tu sesión fue invalidada. Por favor inicia sesión de nuevo',
    AUTH_EMAIL_DELIVERY_FAILED:  'Error al enviar el correo. Por favor intenta más tarde',
    AUTH_2FA_LOCKED:             'Demasiados intentos de 2FA. Por favor espera antes de intentar de nuevo',
    AUTH_FORBIDDEN:              'No tienes permiso para realizar esta acción',
    AUTH_USER_NOT_FOUND:         'Usuario no encontrado',
  },
};

export function domainErrorMessage(error: string, locale: Locale = 'es'): string {
  return messages[locale]?.[error] ?? messages.es[error] ?? error;
}
