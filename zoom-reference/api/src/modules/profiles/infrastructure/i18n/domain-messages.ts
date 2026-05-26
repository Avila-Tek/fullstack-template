import type { SupportedLocale } from '@zoom/utils';

type ProfilesErrorCode =
	| 'PROFILES_NOTIFICATION_PREFERENCE_NOT_FOUND'
	| 'PROFILES_BUSINESS_PROFILE_NOT_FOUND'
	| 'PROFILES_ADDRESS_COUNTRY_ID_MISSING'
	| 'PROFILES_BUSINESS_ACCOUNT_DOCUMENT_IMMUTABLE'
	| 'PROFILES_BUSINESS_ACCOUNT_FORBIDDEN'
	| 'PROFILES_BUSINESS_ACCOUNT_NOT_FOUND'
	| 'PROFILES_BUSINESS_IDENTITY_CONFLICT'
	| 'PROFILES_GET_MEMBER_PERMISSIONS_FORBIDDEN'
	| 'PROFILES_INVALID_UNIT_OF_MEASURE'
	| 'PROFILES_CITY_LEGACY_ID_MISSING'
	| 'PROFILES_DEFAULT_DIMENSION_UNIT_NOT_FOUND'
	| 'PROFILES_DEFAULT_RETURN_TYPE_NOT_FOUND'
	| 'PROFILES_DEFAULT_WEIGHT_UNIT_NOT_FOUND'
	| 'PROFILES_DOCUMENT_TYPE_NOT_FOUND'
	| 'PROFILES_OWNER_ALREADY_EXISTS'
	| 'PROFILES_PHONE_PREFIX_NOT_FOUND'
	| 'PROFILES_RETURN_PREFERENCE_NOT_FOUND'
	| 'PROFILES_RETURN_TYPE_NOT_FOUND'
	| 'PROFILES_RETURN_TO_REQUIRED'
	| 'PROFILES_RETURN_TO_NOT_ALLOWED'
	| 'PROFILES_RETURN_OFFICE_NOT_ALLOWED'
	| 'PROFILES_RETURN_OFFICE_REQUIRED'
	| 'PROFILES_RETURN_OFFICE_NOT_FOUND'
	| 'PROFILES_BILLING_ADDRESS_NOT_FOUND'
	| 'PROFILES_RETURN_TYPE_NOT_SUPPORTED';

export const profilesMessages: Record<
	ProfilesErrorCode,
	Record<SupportedLocale, string>
> = {
	PROFILES_NOTIFICATION_PREFERENCE_NOT_FOUND: {
		es: 'Preferencia de notificación no encontrada.',
		en: 'Notification preference not found.',
	},
	PROFILES_BUSINESS_PROFILE_NOT_FOUND: {
		es: 'Perfil empresarial no encontrado.',
		en: 'Business profile not found.',
	},
	PROFILES_ADDRESS_COUNTRY_ID_MISSING: {
		es: 'El país de la dirección de facturación es requerido.',
		en: 'The billing address country is required.',
	},
	PROFILES_BUSINESS_ACCOUNT_DOCUMENT_IMMUTABLE: {
		es: 'El documento de identidad no puede ser modificado.',
		en: 'The identity document cannot be modified.',
	},
	PROFILES_BUSINESS_ACCOUNT_FORBIDDEN: {
		es: 'No tiene permisos para modificar esta cuenta empresarial.',
		en: 'You do not have permission to modify this business account.',
	},
	PROFILES_GET_MEMBER_PERMISSIONS_FORBIDDEN: {
		es: 'No autorizado para acceder a los permisos de este miembro.',
		en: "Not authorized to access this member's permissions.",
	},
	PROFILES_BUSINESS_ACCOUNT_NOT_FOUND: {
		es: 'Cuenta empresarial no encontrada.',
		en: 'Business account not found.',
	},
	PROFILES_BUSINESS_IDENTITY_CONFLICT: {
		es: 'Ya existe una cuenta con ese documento de identidad.',
		en: 'A business account with that identity document already exists.',
	},
	PROFILES_INVALID_UNIT_OF_MEASURE: {
		es: 'Unidad de medida inválida o inactiva.',
		en: 'Invalid or inactive unit of measure.',
	},
	PROFILES_CITY_LEGACY_ID_MISSING: {
		es: 'La ciudad seleccionada no tiene un código legacy configurado.',
		en: 'The selected city does not have a legacy code configured.',
	},
	PROFILES_DEFAULT_DIMENSION_UNIT_NOT_FOUND: {
		es: 'No se encontró una unidad de dimensión por defecto en el catálogo.',
		en: 'No default dimension unit found in the catalog.',
	},
	PROFILES_DEFAULT_RETURN_TYPE_NOT_FOUND: {
		es: 'No se encontró un tipo de retorno por defecto en el catálogo.',
		en: 'No default return type found in the catalog.',
	},
	PROFILES_DEFAULT_WEIGHT_UNIT_NOT_FOUND: {
		es: 'No se encontró una unidad de peso por defecto en el catálogo.',
		en: 'No default weight unit found in the catalog.',
	},
	PROFILES_DOCUMENT_TYPE_NOT_FOUND: {
		es: 'Tipo de documento no encontrado.',
		en: 'Document type not found.',
	},
	PROFILES_OWNER_ALREADY_EXISTS: {
		es: 'El usuario ya tiene una cuenta empresarial registrada.',
		en: 'The user already has a registered business account.',
	},
	PROFILES_PHONE_PREFIX_NOT_FOUND: {
		es: 'Prefijo telefónico no encontrado.',
		en: 'Phone prefix not found.',
	},
	PROFILES_RETURN_PREFERENCE_NOT_FOUND: {
		es: 'Preferencia de devolución no encontrada.',
		en: 'Return preference not found.',
	},
	PROFILES_RETURN_TYPE_NOT_FOUND: {
		es: 'Tipo de devolución no encontrado.',
		en: 'Return type not found.',
	},
	PROFILES_RETURN_TO_REQUIRED: {
		es: 'Debe seleccionar dirección u oficina para solicitar devolución.',
		en: 'You must select address or office for return mode.',
	},
	PROFILES_RETURN_TO_NOT_ALLOWED: {
		es: 'El modo destruir no acepta dirección ni oficina.',
		en: 'Destroy mode does not accept address or office.',
	},
	PROFILES_RETURN_OFFICE_NOT_ALLOWED: {
		es: 'No se puede enviar una oficina cuando el destino es dirección.',
		en: 'Cannot provide an office when return-to is address.',
	},
	PROFILES_RETURN_OFFICE_REQUIRED: {
		es: 'Debe seleccionar una oficina para solicitar devolución en oficina.',
		en: 'You must select an office for office mode.',
	},
	PROFILES_RETURN_OFFICE_NOT_FOUND: {
		es: 'Oficina no encontrada o inactiva.',
		en: 'Office not found or inactive.',
	},
	PROFILES_BILLING_ADDRESS_NOT_FOUND: {
		es: 'Dirección de facturación no encontrada. Complete su perfil primero.',
		en: 'Billing address not found. Complete your profile first.',
	},
	PROFILES_RETURN_TYPE_NOT_SUPPORTED: {
		es: 'El tipo de devolución seleccionado no es soportado.',
		en: 'The selected return type is not supported.',
	},
};
