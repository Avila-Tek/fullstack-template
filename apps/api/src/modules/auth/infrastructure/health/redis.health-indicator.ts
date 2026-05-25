import { Inject, Injectable } from '@nestjs/common';
import {
	HealthCheckError,
	HealthIndicator,
	type HealthIndicatorResult,
} from '@nestjs/terminus';
import type Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

@Injectable()
export class RedisHealthIndicator extends HealthIndicator {
	constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
		super();
	}

	async isHealthy(key: string): Promise<HealthIndicatorResult> {
		try {
			await this.redis.ping();
			return this.getStatus(key, true);
		} catch {
			throw new HealthCheckError(
				'Redis check failed',
				this.getStatus(key, false),
			);
		}
	}
}
