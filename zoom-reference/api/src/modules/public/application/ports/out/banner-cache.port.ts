import type { BannerPayload } from '@zoom/schemas';

export abstract class BannerCachePort {
	abstract get(key: string): Promise<BannerPayload | null>;
	/** Always resolves — implementations must absorb errors silently. */
	abstract set(
		key: string,
		value: BannerPayload,
		ttlSeconds: number,
	): Promise<void>;
}
