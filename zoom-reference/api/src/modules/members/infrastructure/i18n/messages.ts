import type { SupportedLocale } from '@zoom/utils';

export type MembersErrorCode =
	| 'MEMBERS_COLLABORATOR_INACTIVE'
	| 'MEMBERS_AT_LEAST_ONE_SERVICE_REQUIRED'
	| 'MEMBERS_OWNER_ONLY'
	| 'MEMBERS_NOT_FOUND'
	| 'MEMBERS_INVALID_STATUS'
	| 'MEMBERS_PROFILE_NOT_FOUND';

export const membersMessages: Record<
	MembersErrorCode,
	Record<SupportedLocale, string>
> = {
	MEMBERS_COLLABORATOR_INACTIVE: {
		es: 'El colaborador no está activo y no puede ser modificado.',
		en: 'The collaborator is not active and cannot be modified.',
	},
	MEMBERS_AT_LEAST_ONE_SERVICE_REQUIRED: {
		es: 'Se requiere al menos un servicio de envío habilitado para el colaborador.',
		en: 'At least one shipping service must be enabled for the member.',
	},
	MEMBERS_OWNER_ONLY: {
		es: 'Solo el propietario de la cuenta puede realizar esta acción.',
		en: 'Only the business account owner can perform this action.',
	},
	MEMBERS_NOT_FOUND: {
		es: 'Colaborador no encontrado.',
		en: 'Collaborator not found.',
	},
	MEMBERS_INVALID_STATUS: {
		es: 'Esta acción no está disponible para el estado actual del colaborador.',
		en: "This action is not available for the collaborator's current status.",
	},
	MEMBERS_PROFILE_NOT_FOUND: {
		es: 'Perfil no encontrado o acceso denegado.',
		en: 'Profile not found or access denied.',
	},
};
