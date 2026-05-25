import { Inject, Injectable } from '@nestjs/common';
import type Redis from 'ioredis';
import { BruteForceServicePort } from '../../application/ports/out/brute-force-service.port';
import { env } from '../../env';
import { REDIS_CLIENT } from '../redis/redis.constants';

@Injectable()
export class RedisBruteForceAdapter extends BruteForceServicePort {
	private readonly lockWindowSeconds: number;

	constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
		super();
		this.lockWindowSeconds = env.BRUTE_FORCE_LOCK_WINDOW_SECONDS;
	}

	async increment(key: string): Promise<number> {
		const count = await this.redis.incr(key);
		if (count === 1) {
			await this.redis.expire(key, this.lockWindowSeconds);
		}
		return count;
	}

	async getCount(key: string): Promise<number> {
		const raw = await this.redis.get(key);
		return raw === null ? 0 : Number.parseInt(raw, 10);
	}

	async clear(key: string): Promise<void> {
		await this.redis.del(key);
	}
}
