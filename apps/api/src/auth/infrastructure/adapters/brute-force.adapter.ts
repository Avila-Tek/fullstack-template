import { Inject, Injectable } from '@nestjs/common';
import type { Redis } from 'ioredis';
import { REDIS_CLIENT } from '../../../infrastructure/redis/redis.constants.js';
import { BruteForcePort } from '../../application/ports/out/brute-force.port.js';
import { env } from '../../../env.js';

@Injectable()
export class RedisBruteForceAdapter extends BruteForcePort {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {
    super();
  }

  async increment(email: string): Promise<number> {
    const key = this.key(email);
    const count = await this.redis.incr(key);
    if (count === 1) {
      await this.redis.expire(key, env.BRUTE_FORCE_WINDOW_SECONDS);
    }
    return count;
  }

  async clear(email: string): Promise<void> {
    await this.redis.del(this.key(email));
  }

  async getCount(email: string): Promise<number> {
    const val = await this.redis.get(this.key(email));
    return val ? Number(val) : 0;
  }

  private key(email: string): string {
    return `bf:${email.toLowerCase().trim()}`;
  }
}
