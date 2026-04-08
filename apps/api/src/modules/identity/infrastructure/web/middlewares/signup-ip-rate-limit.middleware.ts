import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Injectable, type NestMiddleware, Optional } from '@nestjs/common';
import Redis from 'ioredis';

const RATE_LIMIT = 5;
const WINDOW_SECONDS = 3600;
const TOO_MANY_MESSAGE = 'Too many sign-up attempts. Try again in 1 hour.';

interface RedisLike {
	incr(key: string): Promise<number>;
	expire(key: string, seconds: number): Promise<number>;
}

type RequestWithIp = IncomingMessage & { ip?: string };

@Injectable()
export class SignupIpRateLimitMiddleware implements NestMiddleware {
	private readonly redis: RedisLike;

	constructor(@Optional() redis?: RedisLike) {
		// Accept injected redis (tests) or create real instance
		this.redis =
			redis ??
			new Redis({
				host: process.env.REDIS_HOST ?? '127.0.0.1',
				port: Number(process.env.REDIS_PORT ?? 6379),
			});
	}

	async use(
		req: RequestWithIp,
		res: ServerResponse,
		next: () => void,
	): Promise<void> {
		const ip = req.ip ?? '';
		const hash = createHash('sha256').update(ip).digest('hex');
		const key = `signup_ratelimit:${hash}`;

		const count = await this.redis.incr(key);
		if (count === 1) {
			await this.redis.expire(key, WINDOW_SECONDS);
		}

		if (count > RATE_LIMIT) {
			res.writeHead(429, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ message: TOO_MANY_MESSAGE }));
			return;
		}

		next();
	}
}
