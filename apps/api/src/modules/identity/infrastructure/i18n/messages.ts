import type { SupportedLocale } from '@/shared/domain-utils';

type IdentityErrorCode =
	| 'IDENTITY_INVALID_CREDENTIALS'
	| 'IDENTITY_INVALID_PASSWORD'
	| 'IDENTITY_NO_PASSWORD_ACCOUNT'
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
	IDENTITY_NO_PASSWORD_ACCOUNT: {
		es: 'No se encontró una cuenta con contraseña para este usuario.',
		en: 'No password account found for this user.',
	},
	IDENTITY_INVALID_PASSWORD: {
		es: 'La contraseña no cumple con los requisitos.',
		en: 'Password does not meet requirements.',
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
