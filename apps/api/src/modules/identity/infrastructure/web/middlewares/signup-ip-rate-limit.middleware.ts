import { createHash } from 'node:crypto';
import type { IncomingMessage, ServerResponse } from 'node:http';
import { Inject, Injectable, type NestMiddleware } from '@nestjs/common';
import { resolveClientIp } from '@/shared/utils/resolve-client-ip';
import { REDIS_CLIENT } from '../../redis/redis.constants';

const RATE_LIMIT = 5;
const WINDOW_SECONDS = 3600;
const WINDOW_HOURS = Math.round(WINDOW_SECONDS / 3600);
const TOO_MANY_MESSAGE = `Too many sign-up attempts. Try again in ${WINDOW_HOURS} hour${WINDOW_HOURS === 1 ? '' : 's'}.`;

const LUA_INCR_WITH_TTL = `
  local c = redis.call('INCR', KEYS[1])
  if c == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
  return c
`;

interface RedisLike {
	eval(
		script: string,
		numkeys: number,
		key: string,
		ttl: string,
	): Promise<unknown>;
}

type RequestWithIp = IncomingMessage & { ip?: string };

@Injectable()
export class SignupIpRateLimitMiddleware implements NestMiddleware {
	private readonly redis: RedisLike;

	constructor(@Inject(REDIS_CLIENT) redis: RedisLike) {
		this.redis = redis;
	}

	async use(
		req: RequestWithIp,
		res: ServerResponse,
		next: () => void,
	): Promise<void> {
		const ip = resolveClientIp(req);
		const hash = createHash('sha256').update(ip).digest('hex');
		const key = `signup_ratelimit:${hash}`;

		const count = (await this.redis.eval(
			LUA_INCR_WITH_TTL,
			1,
			key,
			String(WINDOW_SECONDS),
		)) as number;

		if (count > RATE_LIMIT) {
			res.writeHead(429, { 'Content-Type': 'application/json' });
			res.end(JSON.stringify({ message: TOO_MANY_MESSAGE }));
			return;
		}

		next();
	}
}
