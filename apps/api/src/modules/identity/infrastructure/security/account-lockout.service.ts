import { normalizeEmail } from '@/shared/utils/normalize-email';

const MAX_FAILURES = 10;
const LOCKOUT_WINDOW_SECONDS = 15 * 60; // 900 s

const LUA_RECORD_FAILURE = `
  local f = redis.call('INCR', KEYS[1])
  redis.call('EXPIRE', KEYS[1], ARGV[1])
  if tonumber(f) >= tonumber(ARGV[2]) then
    redis.call('SET', KEYS[2], '1', 'EX', ARGV[1])
  end
  return f
`;

interface RedisLike {
	eval(
		script: string,
		numkeys: number,
		failKey: string,
		blockedKey: string,
		ttl: string,
		threshold: string,
	): Promise<unknown>;
	del(failKey: string, blockedKey: string): Promise<unknown>;
	exists(key: string): Promise<number>;
}

export class AccountLockoutService {
	private readonly redis: RedisLike;

	constructor(redis: RedisLike) {
		this.redis = redis;
	}

	async recordFailure(email: string): Promise<void> {
		const key = normalizeEmail(email);
		await this.redis.eval(
			LUA_RECORD_FAILURE,
			2,
			`account_lockout_failures:${key}`,
			`account_lockout_blocked:${key}`,
			String(LOCKOUT_WINDOW_SECONDS),
			String(MAX_FAILURES),
		);
	}

	async recordSuccess(email: string): Promise<void> {
		const key = normalizeEmail(email);
		await this.redis.del(
			`account_lockout_failures:${key}`,
			`account_lockout_blocked:${key}`,
		);
	}

	async isLocked(email: string): Promise<boolean> {
		const key = normalizeEmail(email);
		const result = await this.redis.exists(`account_lockout_blocked:${key}`);
		return result === 1;
	}
}
