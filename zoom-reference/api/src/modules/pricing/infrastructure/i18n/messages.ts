import type { SupportedLocale } from '@zoom/utils';

type PricingErrorCode =
	| 'PRICING_LOCKER_INVALID'
	| 'PRICING_CALCULATION_FAILED'
	| 'PRICING_WEIGHT_EXCEEDS_LIMIT'
	| 'PRICING_DECLARED_VALUE_OUT_OF_RANGE'
	| 'PRICING_HOME_DELIVERY_NOT_AVAILABLE'
	| 'PRICING_COD_NOT_AVAILABLE'
	| 'PRICING_ROUTE_NOT_FOUND'
	| 'PRICING_BASE_RATE_NOT_FOUND'
	| 'PRICING_ORIGIN_CITY_NOT_CONFIGURED'
	| 'PRICING_BCV_RATE_MISSING';

export const pricingMessages: Record<
	PricingErrorCode,
	Record<SupportedLocale, string>
> = {
	// AC-02 catch-all message — surfaced for every PRICING_LOCKER_INVALID
	// (regardless of underlying granular failureCode).
	PRICING_LOCKER_INVALID: {
		es: 'Casillero inactivo o inexistente. Asegúrate de que las siglas y el casillero sean correctos.',
		en: 'Locker is inactive or does not exist. Please verify the office code and locker number.',
	},
	PRICING_CALCULATION_FAILED: {
		es: 'No fue posible calcular la tarifa para esta combinación. Verifica los datos e intenta nuevamente.',
		en: 'Unable to calculate the rate for this combination. Verify the data and try again.',
	},
	PRICING_WEIGHT_EXCEEDS_LIMIT: {
		es: 'El peso excede el máximo permitido de {maxWeightKg} kg para esta ruta.',
		en: 'The weight exceeds the maximum of {maxWeightKg} kg allowed for this route.',
	},
	PRICING_DECLARED_VALUE_OUT_OF_RANGE: {
		es: 'El valor declarado debe estar entre {min} Bs y {max} Bs.',
		en: 'The declared value must be between {min} Bs and {max} Bs.',
	},
	PRICING_HOME_DELIVERY_NOT_AVAILABLE: {
		es: 'La modalidad Domicilio no está disponible para la ciudad de destino.',
		en: 'Home delivery is not available for the destination city.',
	},
	PRICING_COD_NOT_AVAILABLE: {
		es: 'El pago en destino (COD) no está disponible para la ciudad de destino.',
		en: 'Cash on delivery (COD) is not available for the destination city.',
	},
	PRICING_ROUTE_NOT_FOUND: {
		es: 'No fue posible calcular la tarifa para esta combinación de origen y destino. Verifica los datos e intenta nuevamente.',
		en: 'Could not calculate the rate for this origin/destination pair. Check the data and try again.',
	},
	PRICING_BASE_RATE_NOT_FOUND: {
		es: 'No fue posible calcular la tarifa para esta combinación de origen y destino. Verifica los datos e intenta nuevamente.',
		en: 'Could not calculate the rate for this origin/destination pair. Check the data and try again.',
	},
	PRICING_ORIGIN_CITY_NOT_CONFIGURED: {
		es: 'No fue posible determinar la ciudad de origen. Verifique los datos de su perfil.',
		en: 'Could not determine the origin city. Please verify your profile data.',
	},
	PRICING_BCV_RATE_MISSING: {
		es: 'No fue posible obtener la tasa BCV para esta cotización. Intenta de nuevo en unos segundos.',
		en: 'Could not retrieve the BCV rate for this quote. Please try again in a few seconds.',
	},
};
