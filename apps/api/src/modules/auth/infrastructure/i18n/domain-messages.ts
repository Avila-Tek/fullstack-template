import type { SupportedLocale } from '@zoom/utils';

type AuthErrorCode =
	| 'AUTH_ACCESS_DENIED'
	| 'AUTH_CANNOT_REMOVE_OWNER'
	| 'AUTH_INVALID_CREDENTIALS'
	| 'AUTH_INVALID_API_BASE_URL'
	| 'AUTH_INVALID_PASSWORD'
	| 'AUTH_MEMBER_NOT_FOUND'
	| 'AUTH_NO_PASSWORD_ACCOUNT'
	| 'AUTH_NOT_PLATFORM_ADMIN'
	| 'AUTH_NOT_SYSTEM_ADMIN'
	| 'AUTH_PASSWORD_REUSE'
	| 'AUTH_SESSION_EXPIRED'
	| 'AUTH_SESSION_INVALIDATED'
	| 'AUTH_SYSTEM_CONFLICT'
	| 'AUTH_SYSTEM_INACTIVE'
	| 'AUTH_SYSTEM_NOT_FOUND'
	| 'AUTH_TERMS_NO_ACTIVE_VERSION'
	| 'AUTH_USER_NOT_FOUND'
	| 'AUTH_2FA_LOCKED'
	| 'AUTH_2FA_OTP_RATE_LIMITED'
	| 'AUTH_2FA_TOTP_REPLAY'
	| 'AUTH_2FA_SMS_DELIVERY_FAILED'
	| 'AUTH_EMAIL_DELIVERY_FAILED';

export const authDomainMessages: Record<
	AuthErrorCode,
	Record<SupportedLocale, string>
> = {
	AUTH_ACCESS_DENIED: {
		es: 'No tienes acceso a este sistema.',
		en: 'You do not have access to this system.',
	},
	AUTH_CANNOT_REMOVE_OWNER: {
		es: 'No es posible eliminar al propietario del sistema.',
		en: 'The system owner cannot be removed.',
	},
	AUTH_INVALID_CREDENTIALS: {
		es: 'La contraseña actual es incorrecta.',
		en: 'Current password is incorrect.',
	},
	AUTH_NO_PASSWORD_ACCOUNT: {
		es: 'No se encontró una cuenta con contraseña para este usuario.',
		en: 'No password account found for this user.',
	},
	AUTH_INVALID_PASSWORD: {
		es: 'La contraseña no cumple con los requisitos.',
		en: 'Password does not meet requirements.',
	},
	AUTH_PASSWORD_REUSE: {
		es: 'La nueva contraseña no debe coincidir con ninguna de tus últimas 5 contraseñas.',
		en: 'New password must not match any of your last 5 passwords.',
	},
	AUTH_SYSTEM_NOT_FOUND: {
		es: 'El sistema no fue encontrado.',
		en: 'System not found.',
	},
	AUTH_SYSTEM_CONFLICT: {
		es: 'Ya existe un sistema con el mismo nombre o slug.',
		en: 'A system with the same name or slug already exists.',
	},
	AUTH_SYSTEM_INACTIVE: {
		es: 'El sistema está inactivo o suspendido.',
		en: 'The system is inactive or suspended.',
	},
	AUTH_INVALID_API_BASE_URL: {
		es: 'La URL base de la API no es válida.',
		en: 'The API base URL is invalid.',
	},
	AUTH_NOT_PLATFORM_ADMIN: {
		es: 'No tienes permisos de administrador de plataforma.',
		en: 'You do not have platform admin permissions.',
	},
	AUTH_TERMS_NO_ACTIVE_VERSION: {
		es: 'No existe una versión activa de los términos y condiciones.',
		en: 'No active version of the terms and conditions exists.',
	},
	AUTH_SESSION_EXPIRED: {
		es: 'La sesión ha expirado por inactividad. Por favor inicia sesión nuevamente.',
		en: 'Session has expired due to inactivity. Please sign in again.',
	},
	AUTH_SESSION_INVALIDATED: {
		es: 'La sesión fue invalidada por un cambio de credenciales. Por favor inicia sesión nuevamente.',
		en: 'Session was invalidated by a credential change. Please sign in again.',
	},
	AUTH_USER_NOT_FOUND: {
		es: 'El usuario no fue encontrado.',
		en: 'User not found.',
	},
	AUTH_2FA_LOCKED: {
		es: 'Has excedido el número máximo de intentos de autenticación de dos factores. Por favor intenta nuevamente en 15 minutos.',
		en: 'You have exceeded the maximum two-factor authentication attempts. Please try again in 15 minutes.',
	},
	AUTH_2FA_OTP_RATE_LIMITED: {
		es: 'Has alcanzado el límite de envíos de código OTP. Intenta nuevamente más tarde.',
		en: 'You have reached the OTP send limit. Please try again later.',
	},
	AUTH_2FA_TOTP_REPLAY: {
		es: 'Este código TOTP ya fue utilizado. Espera al siguiente código.',
		en: 'This TOTP code has already been used. Please wait for the next code.',
	},
	AUTH_2FA_SMS_DELIVERY_FAILED: {
		es: 'No se pudo enviar el código SMS. Intenta nuevamente o usa otro método.',
		en: 'Failed to send the SMS code. Please try again or use another method.',
	},
	AUTH_EMAIL_DELIVERY_FAILED: {
		es: 'No se pudo enviar el correo electrónico. Intenta nuevamente más tarde.',
		en: 'Failed to send the email. Please try again later.',
	},
	AUTH_NOT_SYSTEM_ADMIN: {
		es: 'No tienes permisos para gestionar miembros de este sistema.',
		en: 'You do not have permission to manage members of this system.',
	},
	AUTH_MEMBER_NOT_FOUND: {
		es: 'El miembro no fue encontrado en este sistema.',
		en: 'Member not found in this system.',
	},
};
