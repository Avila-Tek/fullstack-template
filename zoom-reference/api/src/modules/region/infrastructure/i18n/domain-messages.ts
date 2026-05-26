import type { SupportedLocale } from '@zoom/utils';

type RegionErrorCode =
	| 'REGION_COUNTRY_NOT_FOUND'
	| 'REGION_STATE_NOT_FOUND'
	| 'REGION_CITY_NOT_FOUND'
	| 'REGION_MUNICIPALITY_NOT_FOUND'
	| 'REGION_PARISH_NOT_FOUND'
	| 'REGION_POSTAL_CODE_NOT_FOUND';

export const regionMessages: Record<
	RegionErrorCode,
	Record<SupportedLocale, string>
> = {
	REGION_COUNTRY_NOT_FOUND: {
		es: 'País no encontrado.',
		en: 'Country not found.',
	},
	REGION_STATE_NOT_FOUND: {
		es: 'Estado no encontrado.',
		en: 'State not found.',
	},
	REGION_CITY_NOT_FOUND: {
		es: 'Ciudad no encontrada.',
		en: 'City not found.',
	},
	REGION_MUNICIPALITY_NOT_FOUND: {
		es: 'Municipio no encontrado.',
		en: 'Municipality not found.',
	},
	REGION_PARISH_NOT_FOUND: {
		es: 'Parroquia no encontrada.',
		en: 'Parish not found.',
	},
	REGION_POSTAL_CODE_NOT_FOUND: {
		es: 'Código postal no encontrado.',
		en: 'Postal code not found.',
	},
};
