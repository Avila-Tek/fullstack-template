import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SignupIpRateLimitMiddleware } from '@/modules/identity/infrastructure/web/middlewares/signup-ip-rate-limit.middleware';

interface RedisLike {
	eval(script: string, numkeys: number, key: string, ttl: string): Promise<unknown>;
}

function makeRedis(count: number): RedisLike {
	return { eval: vi.fn().mockResolvedValue(count) };
}

function makeReq(
	ip = '1.2.3.4',
	cfIp?: string,
): IncomingMessage & { ip?: string } {
	const headers: Record<string, string> = cfIp ? { 'cf-connecting-ip': cfIp } : {};
	return { ip, headers } as IncomingMessage & { ip?: string };
}

function makeRes(): ServerResponse & {
	writeHead: ReturnType<typeof vi.fn>;
	end: ReturnType<typeof vi.fn>;
} {
	return {
		writeHead: vi.fn(),
		end: vi.fn(),
	} as unknown as ServerResponse & {
		writeHead: ReturnType<typeof vi.fn>;
		end: ReturnType<typeof vi.fn>;
	};
}

describe('SignupIpRateLimitMiddleware', () => {
	let nextMock: ReturnType<typeof vi.fn>;
	let next: () => void;

	beforeEach(() => {
		nextMock = vi.fn();
		next = nextMock as unknown as () => void;
	});

	it('calls next when under the rate limit', async () => {
		const middleware = new SignupIpRateLimitMiddleware(makeRedis(1));
		const res = makeRes();

		await middleware.use(makeReq(), res, next);

		expect(nextMock).toHaveBeenCalledOnce();
		expect(res.writeHead).not.toHaveBeenCalled();
	});

	it('calls next at exactly the rate limit boundary (5)', async () => {
		const middleware = new SignupIpRateLimitMiddleware(makeRedis(5));
		const res = makeRes();

		await middleware.use(makeReq(), res, next);

		expect(nextMock).toHaveBeenCalledOnce();
	});

	it('returns 429 when over the rate limit', async () => {
		const middleware = new SignupIpRateLimitMiddleware(makeRedis(6));
		const res = makeRes();

		await middleware.use(makeReq(), res, next);

		expect(nextMock).not.toHaveBeenCalled();
		expect(res.writeHead).toHaveBeenCalledWith(429, {
			'Content-Type': 'application/json',
		});
	});

	it('calls eval with a Lua script containing INCR and EXPIRE', async () => {
		const redis = makeRedis(1);
		const middleware = new SignupIpRateLimitMiddleware(redis);

		await middleware.use(makeReq(), makeRes(), next);

		const evalMock = redis.eval as ReturnType<typeof vi.fn>;
		expect(evalMock).toHaveBeenCalledOnce();
		const [script] = evalMock.mock.calls[0] as [string, ...unknown[]];
		expect(script).toContain('INCR');
		expect(script).toContain('EXPIRE');
	});

	it('passes TTL argument of 3600 to eval', async () => {
		const redis = makeRedis(1);
		const middleware = new SignupIpRateLimitMiddleware(redis);

		await middleware.use(makeReq(), makeRes(), next);

		const evalMock = redis.eval as ReturnType<typeof vi.fn>;
		const args = evalMock.mock.calls[0] as unknown[];
		expect(args[3]).toBe('3600');
	});

	it('uses different redis keys for different IPs', async () => {
		const redis = makeRedis(1);
		const middleware = new SignupIpRateLimitMiddleware(redis);

		await middleware.use(makeReq('1.1.1.1'), makeRes(), next);
		await middleware.use(makeReq('2.2.2.2'), makeRes(), next);

		const evalMock = redis.eval as ReturnType<typeof vi.fn>;
		const key1 = (evalMock.mock.calls[0] as unknown[])[2];
		const key2 = (evalMock.mock.calls[1] as unknown[])[2];
		expect(key1).not.toBe(key2);
	});

	it('uses cf-connecting-ip header over req.ip for key derivation', async () => {
		const redis = makeRedis(1);
		const middleware = new SignupIpRateLimitMiddleware(redis);
		const cfIp = '5.5.5.5';

		await middleware.use(makeReq('1.2.3.4', cfIp), makeRes(), next);

		const evalMock = redis.eval as ReturnType<typeof vi.fn>;
		const key = (evalMock.mock.calls[0] as unknown[])[2] as string;
		const expectedHash = createHash('sha256').update(cfIp).digest('hex');
		expect(key).toBe(`signup_ratelimit:${expectedHash}`);
	});

	it('falls back to req.ip when cf-connecting-ip is absent', async () => {
		const redis = makeRedis(1);
		const middleware = new SignupIpRateLimitMiddleware(redis);
		const ip = '1.2.3.4';

		await middleware.use(makeReq(ip), makeRes(), next);

		const evalMock = redis.eval as ReturnType<typeof vi.fn>;
		const key = (evalMock.mock.calls[0] as unknown[])[2] as string;
		const expectedHash = createHash('sha256').update(ip).digest('hex');
		expect(key).toBe(`signup_ratelimit:${expectedHash}`);
	});
});
