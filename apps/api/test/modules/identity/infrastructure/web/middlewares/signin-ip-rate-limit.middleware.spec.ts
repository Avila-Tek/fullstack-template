import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SigninIpRateLimitMiddleware } from '@/modules/identity/infrastructure/web/middlewares/signin-ip-rate-limit.middleware';

interface RedisLike {
	incr(key: string): Promise<number>;
	expire(key: string, seconds: number): Promise<number>;
}

function makeRedis(count: number): RedisLike {
	return {
		incr: vi.fn().mockResolvedValue(count),
		expire: vi.fn().mockResolvedValue(1),
	};
}

function makeReq(ip = '1.2.3.4'): IncomingMessage & { ip?: string } {
	return { ip } as IncomingMessage & { ip?: string };
}

function makeRes(): ServerResponse & { writeHead: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> } {
	return {
		writeHead: vi.fn(),
		end: vi.fn(),
	} as unknown as ServerResponse & { writeHead: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> };
}

describe('SigninIpRateLimitMiddleware', () => {
	let next: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		next = vi.fn();
	});

	it('calls next when under the rate limit', async () => {
		const middleware = new SigninIpRateLimitMiddleware(makeRedis(1));
		const res = makeRes();

		await middleware.use(makeReq(), res, next);

		expect(next).toHaveBeenCalledOnce();
		expect(res.writeHead).not.toHaveBeenCalled();
	});

	it('calls next at exactly the rate limit boundary', async () => {
		const middleware = new SigninIpRateLimitMiddleware(makeRedis(20));
		const res = makeRes();

		await middleware.use(makeReq(), res, next);

		expect(next).toHaveBeenCalledOnce();
	});

	it('returns 429 when over the rate limit', async () => {
		const middleware = new SigninIpRateLimitMiddleware(makeRedis(21));
		const res = makeRes();

		await middleware.use(makeReq(), res, next);

		expect(next).not.toHaveBeenCalled();
		expect(res.writeHead).toHaveBeenCalledWith(429, {
			'Content-Type': 'application/json',
		});
		expect(res.end).toHaveBeenCalledWith(
			JSON.stringify({ message: 'Too many sign-in attempts. Try again in 1 hour.' }),
		);
	});

	it('sets expiry only on the first request (count === 1)', async () => {
		const redis = makeRedis(1);
		const middleware = new SigninIpRateLimitMiddleware(redis);

		await middleware.use(makeReq(), makeRes(), next);

		expect(redis.expire).toHaveBeenCalledWith(expect.stringContaining('signin_ratelimit:'), 3600);
	});

	it('does not set expiry on subsequent requests (count > 1)', async () => {
		const redis = makeRedis(5);
		const middleware = new SigninIpRateLimitMiddleware(redis);

		await middleware.use(makeReq(), makeRes(), next);

		expect(redis.expire).not.toHaveBeenCalled();
	});

	it('uses different redis keys for different IPs', async () => {
		const redis = makeRedis(1);
		const middleware = new SigninIpRateLimitMiddleware(redis);

		await middleware.use(makeReq('1.1.1.1'), makeRes(), next);
		await middleware.use(makeReq('2.2.2.2'), makeRes(), next);

		const calls = (redis.incr as ReturnType<typeof vi.fn>).mock.calls;
		expect(calls[0][0]).not.toBe(calls[1][0]);
	});

	it('falls back to empty string ip when req.ip is undefined', async () => {
		const redis = makeRedis(1);
		const middleware = new SigninIpRateLimitMiddleware(redis);
		const req = { ip: undefined } as IncomingMessage & { ip?: string };

		await expect(middleware.use(req, makeRes(), next)).resolves.not.toThrow();
		expect(next).toHaveBeenCalledOnce();
	});
});
