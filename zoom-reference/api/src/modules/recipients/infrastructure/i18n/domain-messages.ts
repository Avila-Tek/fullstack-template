import type { SupportedLocale } from '@zoom/utils';

type RecipientsErrorCode =
	| 'RECIPIENTS_ADDRESS_NOT_SUPPORTED'
	| 'RECIPIENTS_COUNTRY_NOT_FOUND_BY_ISO_CODE'
	| 'RECIPIENTS_DEFAULT_COUNTRY_MISSING'
	| 'RECIPIENTS_LOCKER_INVALID'
	| 'RECIPIENTS_NOT_FOUND'
	| 'RECIPIENTS_PROFILE_NOT_FOUND';

export const recipientsMessages: Record<
	RecipientsErrorCode,
	Record<SupportedLocale, string>
> = {
	RECIPIENTS_ADDRESS_NOT_SUPPORTED: {
		es: 'La dirección indicada no está soportada por el servicio de envíos.',
		en: 'The provided address is not supported by the shipping service.',
	},
	RECIPIENTS_COUNTRY_NOT_FOUND_BY_ISO_CODE: {
		es: 'No se encontró un país con el código ISO proporcionado.',
		en: 'No country was found with the provided ISO code.',
	},
	RECIPIENTS_DEFAULT_COUNTRY_MISSING: {
		es: 'El país por defecto no está configurado en el sistema.',
		en: 'The default country is not configured in the system.',
	},
	RECIPIENTS_LOCKER_INVALID: {
		es: 'Casillero inactivo o inexistente. Asegúrate de que las siglas y el casillero sean correctos. Es posible que el casillero esté inactivo.',
		en: 'Locker inactive or not found. Make sure the initials and locker code are correct. The locker may be inactive.',
	},
	RECIPIENTS_NOT_FOUND: {
		es: 'Destinatario no encontrado.',
		en: 'Recipient not found.',
	},
	RECIPIENTS_PROFILE_NOT_FOUND: {
		es: 'Perfil de negocio no encontrado para el usuario actual.',
		en: 'Business profile not found for the current user.',
	},
};
