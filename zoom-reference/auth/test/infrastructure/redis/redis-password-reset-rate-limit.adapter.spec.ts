import type { IStructuredLogger } from '@zoom/utils';
import type Redis from 'ioredis';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { env } from '../../../src/env';
import { RedisPasswordResetRateLimitAdapter } from '../../../src/infrastructure/redis/redis-password-reset-rate-limit.adapter';

function makeRedisMock() {
	return {
		incr: vi.fn(),
		expire: vi.fn().mockResolvedValue(1),
		ttl: vi.fn().mockResolvedValue(60),
	};
}

function makeLogger(): IStructuredLogger {
	return {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		debug: vi.fn(),
	};
}

describe('RedisPasswordResetRateLimitAdapter', () => {
	let redis: ReturnType<typeof makeRedisMock>;
	let logger: IStructuredLogger;
	let adapter: RedisPasswordResetRateLimitAdapter;

	beforeEach(() => {
		redis = makeRedisMock();
		logger = makeLogger();
		adapter = new RedisPasswordResetRateLimitAdapter(
			redis as unknown as Redis,
			logger,
		);
	});

	describe('hitEmail', () => {
		it('allows first hit and sets the window expiry', async () => {
			redis.incr.mockResolvedValue(1);

			const result = await adapter.hitEmail('hash-1');

			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(
				env.PASSWORD_RESET_EMAIL_RATE_LIMIT_MAX - 1,
			);
			expect(redis.incr).toHaveBeenCalledWith('pwreset:email:hash-1');
			expect(redis.expire).toHaveBeenCalledWith(
				'pwreset:email:hash-1',
				env.PASSWORD_RESET_EMAIL_RATE_LIMIT_WINDOW_SECONDS,
			);
		});

		it('does not reset expiry on subsequent hits', async () => {
			redis.incr.mockResolvedValue(2);

			await adapter.hitEmail('hash-1');

			expect(redis.expire).not.toHaveBeenCalled();
		});

		it('allows hits up to the configured max', async () => {
			redis.incr.mockResolvedValue(env.PASSWORD_RESET_EMAIL_RATE_LIMIT_MAX);

			const result = await adapter.hitEmail('hash-1');

			expect(result.allowed).toBe(true);
			expect(result.remaining).toBe(0);
		});

		it('denies hits beyond the configured max and returns retry-after', async () => {
			redis.incr.mockResolvedValue(env.PASSWORD_RESET_EMAIL_RATE_LIMIT_MAX + 1);
			redis.ttl.mockResolvedValue(42);

			const result = await adapter.hitEmail('hash-1');

			expect(result.allowed).toBe(false);
			expect(result.retryAfterSeconds).toBe(42);
		});

		it('returns allowed when Redis throws and logs a warning', async () => {
			redis.incr.mockRejectedValue(new Error('connection refused'));

			const result = await adapter.hitEmail('hash-1');

			expect(result.allowed).toBe(true);
			expect(logger.warn).toHaveBeenCalledOnce();
		});
	});
});
