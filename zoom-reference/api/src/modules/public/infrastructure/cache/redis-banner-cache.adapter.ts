import { Inject, Injectable, Optional } from '@nestjs/common';
import { type BannerPayload, BannerPayloadSchema } from '@zoom/schemas';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import type { Redis } from 'ioredis';
import { BannerCachePort } from '../../application/ports/out/banner-cache.port';
import { REDIS_CLIENT } from './redis.provider';

@Injectable()
export class RedisBannerCacheAdapter extends BannerCachePort {
	constructor(
		@Inject(REDIS_CLIENT) private readonly redis: Redis,
		@Inject(LOGGER_PORT)
		@Optional()
		private readonly logger?: IStructuredLogger,
	) {
		super();
	}

	async get(key: string): Promise<BannerPayload | null> {
		try {
			const raw = await this.redis.get(key);
			if (raw === null) return null;
			const parsed: unknown = JSON.parse(raw);
			const result = BannerPayloadSchema.safeParse(parsed);
			if (!result.success) {
				this.logger?.warn(
					{
						event: 'public_banners_cache_invalid',
						error: result.error.message,
					},
					'Stale or malformed data in Redis cache — treating as miss',
				);
				return null;
			}
			return result.data;
		} catch (err) {
			this.logger?.error(
				{ event: 'public_banners_cache_unavailable', error: String(err) },
				'Redis get failed',
			);
			return null;
		}
	}

	async set(
		key: string,
		value: BannerPayload,
		ttlSeconds: number,
	): Promise<void> {
		try {
			await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
		} catch (err) {
			this.logger?.error(
				{ event: 'public_banners_cache_unavailable', error: String(err) },
				'Redis set failed',
			);
		}
	}
}
