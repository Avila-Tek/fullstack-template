import type { SupportedLocale } from '@zoom/utils';

export type RoleTemplatesErrorCode = 'ROLE_TEMPLATES_NOT_FOUND';

export const roleTemplatesMessages: Record<
	RoleTemplatesErrorCode,
	Record<SupportedLocale, string>
> = {
	ROLE_TEMPLATES_NOT_FOUND: {
		es: 'La plantilla de rol especificada no existe.',
		en: 'The specified role template was not found.',
	},
};
