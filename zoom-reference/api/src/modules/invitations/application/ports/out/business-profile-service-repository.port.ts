import type {
	TPaymentType,
	TRecipientType,
	TShippingScope,
	TShippingServiceKey,
} from '@zoom/schemas';

export interface BusinessProfileServiceUpsertProps {
	key: TShippingServiceKey;
	enabled: boolean;
	whitelistEnabled: boolean;
	recipientIds: string[];
}

export abstract class BusinessProfileServiceRepositoryPort {
	/**
	 * Upsert all service rows for a profile.
	 * - Submitted keys: INSERT or UPDATE in place (preserves row IDs).
	 * - Missing keys (exist in DB but absent from payload): set enabled = false.
	 * - Whitelist entries are replaced atomically: existing entries cleared,
	 *   new entries inserted from `recipientIds`.
	 */
	abstract upsertAllForProfile(
		businessProfileId: string,
		data: BusinessProfileServiceUpsertProps[],
	): Promise<void>;

	abstract findAllForProfile(businessProfileId: string): Promise<
		Array<{
			id: string;
			key: TShippingServiceKey;
			shippingScope: TShippingScope;
			recipientType: TRecipientType | null;
			paymentType: TPaymentType | null;
			enabled: boolean;
			whitelistEnabled: boolean;
			recipientCount: number | null;
		}>
	>;
}
