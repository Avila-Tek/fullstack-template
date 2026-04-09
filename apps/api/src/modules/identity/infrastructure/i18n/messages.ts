import type { SupportedLocale } from '@/shared/domain-utils';

type IdentityErrorCode =
	| 'IDENTITY_INVALID_CREDENTIALS'
	| 'IDENTITY_INVALID_EMAIL'
	| 'IDENTITY_INVALID_PASSWORD'
	| 'IDENTITY_NO_PASSWORD_ACCOUNT'
	| 'IDENTITY_PASSWORD_MIN_LENGTH'
	| 'IDENTITY_PASSWORD_MISSING_DIGIT'
	| 'IDENTITY_PASSWORD_MISSING_LOWERCASE'
	| 'IDENTITY_PASSWORD_MISSING_SPECIAL'
	| 'IDENTITY_PASSWORD_MISSING_UPPERCASE'
	| 'IDENTITY_PASSWORD_REUSE'
	| 'IDENTITY_SESSION_NOT_FRESH';

export const identityDomainMessages: Record<
	IdentityErrorCode,
	Record<SupportedLocale, string>
> = {
	IDENTITY_INVALID_CREDENTIALS: {
		es: 'La contraseña actual es incorrecta.',
		en: 'Current password is incorrect.',
	},
	IDENTITY_INVALID_EMAIL: {
		en: 'Invalid email address.',
		es: 'Dirección de correo electrónico inválida.',
	},
	IDENTITY_NO_PASSWORD_ACCOUNT: {
		es: 'No se encontró una cuenta con contraseña para este usuario.',
		en: 'No password account found for this user.',
	},
	IDENTITY_INVALID_PASSWORD: {
		es: 'La contraseña no cumple con los requisitos.',
		en: 'Password does not meet requirements.',
	},
	IDENTITY_PASSWORD_MIN_LENGTH: {
		en: 'Password must be at least 8 characters.',
		es: 'La contraseña debe tener al menos 8 caracteres.',
	},
	IDENTITY_PASSWORD_MISSING_DIGIT: {
		en: 'Password must contain at least one number.',
		es: 'La contraseña debe contener al menos un número.',
	},
	IDENTITY_PASSWORD_MISSING_LOWERCASE: {
		en: 'Password must contain at least one lowercase letter.',
		es: 'La contraseña debe contener al menos una letra minúscula.',
	},
	IDENTITY_PASSWORD_MISSING_SPECIAL: {
		en: 'Password must contain at least one special character.',
		es: 'La contraseña debe contener al menos un carácter especial.',
	},
	IDENTITY_PASSWORD_MISSING_UPPERCASE: {
		en: 'Password must contain at least one uppercase letter.',
		es: 'La contraseña debe contener al menos una letra mayúscula.',
	},
	IDENTITY_PASSWORD_REUSE: {
		es: 'La nueva contraseña no debe coincidir con ninguna de tus últimas 5 contraseñas.',
		en: 'New password must not match any of your last 5 passwords.',
	},
	IDENTITY_SESSION_NOT_FRESH: {
		es: 'Tu sesión ha expirado. Por favor, inicia sesión nuevamente para continuar.',
		en: 'Your session has expired. Please sign in again to continue.',
	},
};
