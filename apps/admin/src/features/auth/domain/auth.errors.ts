/**
 * Maps Better Auth error codes to user-facing Spanish messages.
 * BA returns a `code` string on the error object alongside `message`.
 *
 * Source: https://www.better-auth.com/docs/reference/error-codes
 */
const BA_ERROR_MESSAGES: Record<string, string> = {
  // Sign-in
  INVALID_EMAIL_OR_PASSWORD:
    'Correo o contraseña incorrectos.',
  EMAIL_NOT_VERIFIED:
    'Debes verificar tu correo antes de iniciar sesión.',
  ACCOUNT_LOCKED:
    'Tu cuenta ha sido bloqueada temporalmente. Intenta más tarde.',

  // Generic
  TOO_MANY_REQUESTS:
    'Demasiados intentos. Espera un momento antes de volver a intentarlo.',
  INTERNAL_SERVER_ERROR:
    'Ocurrió un error inesperado. Por favor intenta de nuevo.',
};

/**
 * Resolve a human-readable Spanish message for a BA error.
 * Falls back to the raw `message` if no mapping is found, or to `fallback`.
 */
export function betterAuthErrorMessage(
  code: string | undefined,
  rawMessage: string | undefined,
  fallback: string
): string {
  if (code && BA_ERROR_MESSAGES[code]) {
    return BA_ERROR_MESSAGES[code];
  }
  return rawMessage ?? fallback;
}
