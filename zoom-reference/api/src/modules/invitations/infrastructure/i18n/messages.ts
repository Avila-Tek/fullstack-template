import type { SupportedLocale } from '@zoom/utils';

export type InvitationsErrorCode =
	| 'INVITATIONS_AT_LEAST_ONE_SERVICE_REQUIRED'
	| 'INVITATIONS_DUPLICATE_PENDING'
	| 'INVITATIONS_EMAIL_ALREADY_MEMBER'
	| 'INVITATIONS_INVALID_PERMISSION_KEY'
	| 'INVITATIONS_OWNER_ONLY'
	| 'INVITATIONS_ROLE_TEMPLATE_NOT_FOUND'
	| 'INVITATION_EMAIL_MISMATCH'
	| 'INVITATION_NOT_FOUND'
	| 'INVITATION_NOT_PENDING';

export const invitationsMessages: Record<
	InvitationsErrorCode,
	Record<SupportedLocale, string>
> = {
	INVITATIONS_AT_LEAST_ONE_SERVICE_REQUIRED: {
		es: 'Se requiere al menos un servicio de envío habilitado para la invitación.',
		en: 'At least one shipping service must be enabled for the invitation.',
	},
	INVITATIONS_INVALID_PERMISSION_KEY: {
		es: 'Una o más de las claves de permisos especificadas no existen.',
		en: 'One or more of the specified permission keys do not exist.',
	},
	INVITATIONS_OWNER_ONLY: {
		es: 'Solo el propietario de la cuenta puede enviar invitaciones.',
		en: 'Only the business account owner can send invitations.',
	},
	INVITATIONS_DUPLICATE_PENDING: {
		es: 'Ya existe una invitación pendiente para este correo en la cuenta.',
		en: 'A pending invitation for this email already exists in this account.',
	},
	INVITATIONS_EMAIL_ALREADY_MEMBER: {
		es: 'Este correo ya está asociado a un perfil activo o invitado en el sistema.',
		en: 'This email is already associated with an active or invited profile in the system.',
	},
	INVITATIONS_ROLE_TEMPLATE_NOT_FOUND: {
		es: 'La plantilla de rol especificada no existe.',
		en: 'The specified role template was not found.',
	},
	INVITATION_NOT_FOUND: {
		es: 'Invitación no encontrada.',
		en: 'Invitation not found.',
	},
	INVITATION_NOT_PENDING: {
		es: 'Esta invitación ya no está activa.',
		en: 'This invitation is no longer active.',
	},
	INVITATION_EMAIL_MISMATCH: {
		es: 'No estás autorizado para realizar esta acción en la invitación.',
		en: 'You are not authorized to act on this invitation.',
	},
};
