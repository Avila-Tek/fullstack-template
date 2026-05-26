import { pgEnum } from 'drizzle-orm/pg-core';

export const shippingServiceKeyEnum = pgEnum('shipping_service_key', [
	'national_guia_origin',
	'national_guia_destination',
	'national_locker',
	'international',
]);

export const shippingScopeEnum = pgEnum('shipping_scope', [
	'national',
	'international',
]);

export const recipientTypeEnum = pgEnum('recipient_type', ['locker', 'guia']);

export const paymentTypeEnum = pgEnum('payment_type', [
	'origin',
	'destination',
]);

export type TShippingServiceKey =
	(typeof shippingServiceKeyEnum.enumValues)[number];
export type TShippingScope = (typeof shippingScopeEnum.enumValues)[number];
export type TRecipientType = (typeof recipientTypeEnum.enumValues)[number];
export type TPaymentType = (typeof paymentTypeEnum.enumValues)[number];

type TupleParts = {
	shippingScope: TShippingScope;
	recipientType: TRecipientType | null;
	paymentType: TPaymentType | null;
};

export const KEY_TO_TUPLE: Record<TShippingServiceKey, TupleParts> = {
	national_guia_origin: {
		shippingScope: 'national',
		recipientType: 'guia',
		paymentType: 'origin',
	},
	national_guia_destination: {
		shippingScope: 'national',
		recipientType: 'guia',
		paymentType: 'destination',
	},
	national_locker: {
		shippingScope: 'national',
		recipientType: 'locker',
		paymentType: null,
	},
	international: {
		shippingScope: 'international',
		recipientType: null,
		paymentType: null,
	},
};
