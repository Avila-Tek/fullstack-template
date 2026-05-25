import type { SupportedLocale } from '@zoom/utils';

export type UsersErrorCode =
	| 'USERS_PROFILE_NOT_FOUND'
	| 'USERS_PROFILE_SUSPENDED'
	| 'USERS_ACCOUNT_DATA_INCONSISTENT'
	| 'USERS_PROFILE_UNEXPECTED_ROLE'
	| 'USERS_PROFILE_DETAIL_LOAD_ERROR';

export const usersMessages: Record<
	UsersErrorCode,
	Record<SupportedLocale, string>
> = {
	USERS_PROFILE_NOT_FOUND: {
		es: 'Perfil de usuario no encontrado.',
		en: 'User profile not found.',
	},
	USERS_PROFILE_SUSPENDED: {
		es: 'El perfil de usuario está suspendido.',
		en: 'User profile is suspended.',
	},
	USERS_ACCOUNT_DATA_INCONSISTENT: {
		es: 'Los datos de la cuenta empresarial son inconsistentes.',
		en: 'Business account data is inconsistent.',
	},
	USERS_PROFILE_UNEXPECTED_ROLE: {
		es: 'El perfil tiene un rol no reconocido.',
		en: 'Profile has an unrecognised role.',
	},
	USERS_PROFILE_DETAIL_LOAD_ERROR: {
		es: 'Error al cargar el detalle del perfil.',
		en: 'Failed to load profile detail.',
	},
};
