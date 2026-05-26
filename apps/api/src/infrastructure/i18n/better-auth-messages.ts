import type { Locale } from './locale.js';

const messages: Record<Locale, Record<string, string>> = {
  en: {
    EMAIL_NOT_VERIFIED:           'Please verify your email before signing in',
    INVALID_EMAIL_OR_PASSWORD:    'Invalid email or password',
    USER_NOT_FOUND:               'No account found with that email',
    USER_ALREADY_EXISTS:          'An account with this email already exists',
    PASSWORD_TOO_SHORT:           'Password must be at least 8 characters',
    PASSWORD_TOO_LONG:            'Password must be at most 128 characters',
    SOCIAL_ACCOUNT_ALREADY_LINKED:'This social account is already linked to another user',
    INVALID_TOKEN:                'Invalid or expired token',
    TOKEN_EXPIRED:                'This link has expired. Please request a new one',
    TOO_MANY_REQUESTS:            'Too many requests. Please wait before trying again',
    SESSION_EXPIRED:              'Your session has expired. Please sign in again',
    UNAUTHORIZED:                 'You must be signed in to perform this action',
    FORBIDDEN:                    'You do not have permission to perform this action',
    EMAIL_VERIFICATION_FAILED:    'Email verification failed. Please try again',
    INVALID_PASSWORD:             'Invalid password',
    EMAIL_CAN_NOT_BE_UPDATED:     'Email cannot be updated',
    CREDENTIAL_ACCOUNT_NOT_FOUND: 'No password set for this account',
    PROVIDER_NOT_FOUND:           'Authentication provider not found',
    INVALID_CALLBACK_URL:         'Invalid callback URL',
    MISSING_OR_NULL_ORIGIN:       'Request origin is missing. Please use a browser or include the Origin header.',
  },
  es: {
    EMAIL_NOT_VERIFIED:           'Por favor verifica tu correo antes de iniciar sesión',
    INVALID_EMAIL_OR_PASSWORD:    'Email o contraseña incorrectos',
    USER_NOT_FOUND:               'No se encontró una cuenta con ese correo',
    USER_ALREADY_EXISTS:          'Ya existe una cuenta con este correo',
    PASSWORD_TOO_SHORT:           'La contraseña debe tener al menos 8 caracteres',
    PASSWORD_TOO_LONG:            'La contraseña no puede tener más de 128 caracteres',
    SOCIAL_ACCOUNT_ALREADY_LINKED:'Esta cuenta social ya está vinculada a otro usuario',
    INVALID_TOKEN:                'Token inválido o expirado',
    TOKEN_EXPIRED:                'Este enlace expiró. Por favor solicita uno nuevo',
    TOO_MANY_REQUESTS:            'Demasiadas solicitudes. Por favor espera antes de intentar de nuevo',
    SESSION_EXPIRED:              'Tu sesión expiró. Por favor inicia sesión de nuevo',
    UNAUTHORIZED:                 'Debes iniciar sesión para realizar esta acción',
    FORBIDDEN:                    'No tienes permiso para realizar esta acción',
    EMAIL_VERIFICATION_FAILED:    'La verificación de correo falló. Por favor intenta de nuevo',
    INVALID_PASSWORD:             'Contraseña incorrecta',
    EMAIL_CAN_NOT_BE_UPDATED:     'El correo no puede ser actualizado',
    CREDENTIAL_ACCOUNT_NOT_FOUND: 'No hay contraseña configurada para esta cuenta',
    PROVIDER_NOT_FOUND:           'Proveedor de autenticación no encontrado',
    INVALID_CALLBACK_URL:         'URL de callback inválida',
    MISSING_OR_NULL_ORIGIN:       'El origen de la solicitud está ausente. Por favor usa un navegador o incluye el header Origin.',
  },
};

/**
 * Returns a translated message for a Better Auth error code.
 * Returns undefined if the code is not in the catalog (so the caller can keep the original).
 */
export function betterAuthMessage(code: string, locale: Locale = 'es'): string | undefined {
  return messages[locale]?.[code] ?? messages.es[code];
}
