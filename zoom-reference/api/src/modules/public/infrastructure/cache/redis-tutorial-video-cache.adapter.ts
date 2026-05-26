import { Inject, Injectable, Optional } from '@nestjs/common';
import type { TTutorialVideoItem } from '@zoom/schemas';
import { TutorialVideoItemSchema } from '@zoom/schemas';
import type { IStructuredLogger } from '@zoom/utils';
import { LOGGER_PORT } from '@zoom/utils';
import type { Redis } from 'ioredis';
import { TutorialVideoCachePort } from '../../application/ports/out/tutorial-video-cache.port';
import { REDIS_CLIENT } from './redis.provider';

@Injectable()
export class RedisTutorialVideoCacheAdapter extends TutorialVideoCachePort {
	constructor(
		@Inject(REDIS_CLIENT) private readonly redis: Redis,
		@Inject(LOGGER_PORT)
		@Optional()
		private readonly logger?: IStructuredLogger,
	) {
		super();
	}

	async get(key: string): Promise<TTutorialVideoItem | null> {
		try {
			const raw = await this.redis.get(key);
			if (raw === null) return null;
			const parsed: unknown = JSON.parse(raw);
			const result = TutorialVideoItemSchema.safeParse(parsed);
			if (!result.success) {
				this.logger?.warn(
					{
						event: 'public_tutorial_video_cache_invalid',
						error: result.error.message,
					},
					'Stale or malformed data in Redis cache — treating as miss',
				);
				return null;
			}
			return result.data;
		} catch (err) {
			this.logger?.error(
				{
					event: 'public_tutorial_video_cache_unavailable',
					error: String(err),
				},
				'Redis get failed',
			);
			return null;
		}
	}

	async set(
		key: string,
		value: TTutorialVideoItem,
		ttlSeconds: number,
	): Promise<void> {
		try {
			await this.redis.setex(key, ttlSeconds, JSON.stringify(value));
		} catch (err) {
			this.logger?.error(
				{
					event: 'public_tutorial_video_cache_unavailable',
					error: String(err),
				},
				'Redis set failed',
			);
		}
	}

	async del(key: string): Promise<void> {
		try {
			await this.redis.del(key);
		} catch (err) {
			this.logger?.error(
				{
					event: 'public_tutorial_video_cache_unavailable',
					error: String(err),
				},
				'Redis del failed',
			);
		}
	}
}
