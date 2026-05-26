import { Injectable } from '@nestjs/common';
import type { BannerItem, BannerPayload } from '@zoom/schemas';
import { env } from '../../../../env';
import { GetPublicBannersUseCasePort } from '../ports/in/get-public-banners.use-case.port';
import { BannerCachePort } from '../ports/out/banner-cache.port';
import { BannerStoragePort } from '../ports/out/banner-storage.port';

const CACHE_KEY = 'public:banners';
const DEFAULT_TTL = 300;
const EMPTY_PAYLOAD: BannerPayload = Object.freeze({
	desktop: Object.freeze([]) as unknown as BannerItem[],
	mobile: Object.freeze([]) as unknown as BannerItem[],
});

@Injectable()
export class GetPublicBannersUseCase extends GetPublicBannersUseCasePort {
	constructor(
		private readonly cache: BannerCachePort,
		private readonly storage: BannerStoragePort,
	) {
		super();
	}

	async execute(): Promise<BannerPayload> {
		const cached = await this.cache.get(CACHE_KEY);
		if (cached !== null) {
			return cached;
		}

		const manifest = await this.storage.fetchManifest();
		if (manifest === null) {
			return EMPTY_PAYLOAD;
		}

		const filtered = manifest.banners
			.filter((b) => b.status === 'published')
			.toSorted((a, b) => {
				if (a.order === null || a.order === undefined) return 1;
				if (b.order === null || b.order === undefined) return -1;
				return a.order - b.order;
			});

		const mobile = filtered.filter((b) => b.type === 'mobile');
		const desktop = filtered.filter((b) => b.type === 'desktop');
		const payload: BannerPayload = { desktop, mobile };

		const ttl =
			env.BANNERS_CACHE_TTL_SECONDS > 0
				? env.BANNERS_CACHE_TTL_SECONDS
				: DEFAULT_TTL;
		await this.cache.set(CACHE_KEY, payload, ttl);

		return payload;
	}
}
