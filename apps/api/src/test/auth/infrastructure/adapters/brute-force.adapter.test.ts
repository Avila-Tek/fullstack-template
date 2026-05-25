import { describe, it, expect, vi } from 'vitest';
import { RedisBruteForceAdapter } from '@/auth/infrastructure/adapters/brute-force.adapter.js';
import type Redis from 'ioredis';

function buildRedis(incrResult = 1): Redis {
  return {
    incr: vi.fn().mockResolvedValue(incrResult),
    expire: vi.fn().mockResolvedValue(1),
    del: vi.fn().mockResolvedValue(1),
    get: vi.fn().mockResolvedValue(String(incrResult)),
  } as unknown as Redis;
}

describe('RedisBruteForceAdapter', () => {
  it('increment returns the new count from Redis INCR', async () => {
    const redis = buildRedis(3);
    const adapter = new RedisBruteForceAdapter(redis);
    const count = await adapter.increment('user@example.com');
    expect(count).toBe(3);
    expect(redis.incr).toHaveBeenCalledWith('bf:user@example.com');
  });

  it('increment sets TTL when count is 1 (new key)', async () => {
    const redis = buildRedis(1);
    const adapter = new RedisBruteForceAdapter(redis);
    await adapter.increment('new@example.com');
    expect(redis.expire).toHaveBeenCalled();
  });

  it('increment does NOT reset TTL when count > 1', async () => {
    const redis = buildRedis(2);
    const adapter = new RedisBruteForceAdapter(redis);
    await adapter.increment('user@example.com');
    expect(redis.expire).not.toHaveBeenCalled();
  });

  it('clear calls DEL on the key', async () => {
    const redis = buildRedis();
    const adapter = new RedisBruteForceAdapter(redis);
    await adapter.clear('user@example.com');
    expect(redis.del).toHaveBeenCalledWith('bf:user@example.com');
  });

  it('normalizes email to lowercase for key', async () => {
    const redis = buildRedis(1);
    const adapter = new RedisBruteForceAdapter(redis);
    await adapter.increment('USER@EXAMPLE.COM');
    expect(redis.incr).toHaveBeenCalledWith('bf:user@example.com');
  });
});
