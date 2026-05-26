import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import type Redis from 'ioredis';
import {
	PasswordResetRateLimitPort,
	type RateLimitResult,
} from '../../application/ports/out/password-reset-rate-limit.port';
import { env } from '../../env';
import { recordAuthEvent } from '../../shared/metrics/auth-metrics';
import { REDIS_CLIENT } from './redis.constants';

@Injectable()
export class RedisPasswordResetRateLimitAdapter extends PasswordResetRateLimitPort {
	private readonly max: number;
	private readonly windowSeconds: number;

	constructor(
		@Inject(REDIS_CLIENT) private readonly redis: Redis,
		@Inject(LOGGER_PORT) private readonly logger: IStructuredLogger,
	) {
		super();
		this.max = env.PASSWORD_RESET_EMAIL_RATE_LIMIT_MAX;
		this.windowSeconds = env.PASSWORD_RESET_EMAIL_RATE_LIMIT_WINDOW_SECONDS;
	}

	async hitEmail(normalizedEmailHash: string): Promise<RateLimitResult> {
		const key = `pwreset:email:${normalizedEmailHash}`;
		try {
			const count = await this.redis.incr(key);
			if (count === 1) {
				await this.redis.expire(key, this.windowSeconds);
			}
			if (count > this.max) {
				const ttl = await this.redis.ttl(key);
				return {
					allowed: false,
					retryAfterSeconds: ttl > 0 ? ttl : this.windowSeconds,
				};
			}
			return { allowed: true, remaining: this.max - count };
		} catch (err) {
			this.logger.warn(
				{ err, key },
				'password-reset-rate-limit: redis failure; failing open',
			);
			// Surfaces to oncall: rate limiting is degraded; every call that
			// hits this branch is unthrottled until Redis recovers.
			recordAuthEvent('password_reset_rate_limit_degraded');
			return { allowed: true };
		}
	}
}
