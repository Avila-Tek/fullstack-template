/**
 * Spanish translations for better-auth error codes.
 *
 * English is the built-in default — only non-English locales need entries here.
 * Keys must match better-auth's BASE_ERROR_CODES and plugin error code constants.
 */
export const esBetterAuthTranslations: Record<string, string> = {
	// ── Authentication ──────────────────────────────────────────────
	INVALID_EMAIL_OR_PASSWORD: 'Correo electrónico o contraseña inválidos.',
	INVALID_EMAIL: 'Correo electrónico inválido.',
	INVALID_PASSWORD: 'Contraseña inválida.',
	PASSWORD_TOO_SHORT: 'La contraseña es demasiado corta.',
	PASSWORD_TOO_LONG: 'La contraseña es demasiado larga.',
	PASSWORD_ALREADY_SET: 'La contraseña ya está configurada.',
	CREDENTIAL_ACCOUNT_NOT_FOUND:
		'No se encontró una cuenta con credenciales.',

	// ── Users ───────────────────────────────────────────────────────
	USER_NOT_FOUND: 'Usuario no encontrado.',
	USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL:
		'El usuario ya existe. Usa otro correo electrónico.',
	USER_EMAIL_NOT_FOUND:
		'No se encontró un correo electrónico para este usuario.',

	// ── Email verification ──────────────────────────────────────────
	EMAIL_NOT_VERIFIED: 'El correo electrónico no ha sido verificado.',
	EMAIL_ALREADY_VERIFIED: 'El correo electrónico ya está verificado.',
	EMAIL_CAN_NOT_BE_UPDATED:
		'El correo electrónico no puede ser actualizado.',
	EMAIL_MISMATCH: 'El correo electrónico no coincide.',
	VERIFICATION_EMAIL_NOT_ENABLED:
		'El envío de correos de verificación no está habilitado.',

	// ── Sessions & tokens ──────────────────────────────────────────
	SESSION_EXPIRED: 'La sesión ha expirado.',
	SESSION_NOT_FRESH:
		'La sesión no es reciente. Por favor, vuelve a iniciar sesión.',
	INVALID_TOKEN: 'Token inválido.',
	TOKEN_EXPIRED: 'El token ha expirado.',

	// ── Account linking ─────────────────────────────────────────────
	ACCOUNT_NOT_FOUND: 'Cuenta no encontrada.',
	FAILED_TO_UNLINK_LAST_ACCOUNT:
		'No se puede desvincular la última cuenta.',

	// ── Origin / CSRF ──────────────────────────────────────────────
	INVALID_ORIGIN: 'Origen no válido.',
	CROSS_SITE_NAVIGATION_LOGIN_BLOCKED:
		'Inicio de sesión bloqueado por navegación entre sitios.',

	// ── Two-Factor Authentication ──────────────────────────────────
	OTP_NOT_ENABLED: 'OTP no está habilitado.',
	OTP_HAS_EXPIRED: 'El código OTP ha expirado.',
	TOTP_NOT_ENABLED: 'TOTP no está habilitado.',
	TWO_FACTOR_NOT_ENABLED:
		'La autenticación de dos factores no está habilitada.',
	BACKUP_CODES_NOT_ENABLED:
		'Los códigos de respaldo no están habilitados.',
	INVALID_BACKUP_CODE: 'Código de respaldo inválido.',
	INVALID_CODE: 'Código inválido.',
	TOO_MANY_ATTEMPTS_REQUEST_NEW_CODE:
		'Demasiados intentos. Por favor, solicita un nuevo código.',
	INVALID_TWO_FACTOR_COOKIE:
		'Cookie de autenticación de dos factores inválida.',

	// ── Server errors (generic — never leak internals) ─────────────
	FAILED_TO_CREATE_SESSION: 'Ocurrió un error inesperado.',
	FAILED_TO_CREATE_USER: 'Ocurrió un error inesperado.',
	FAILED_TO_GET_SESSION: 'Ocurrió un error inesperado.',
	FAILED_TO_GET_USER_INFO: 'Ocurrió un error inesperado.',
	FAILED_TO_UPDATE_USER: 'Ocurrió un error inesperado.',
};
