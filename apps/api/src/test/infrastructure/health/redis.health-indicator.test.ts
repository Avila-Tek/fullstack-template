import { describe, it, expect, vi } from 'vitest';
import { HealthCheckError } from '@nestjs/terminus';
import { RedisHealthIndicator } from '../../../infrastructure/health/redis.health-indicator';
import type Redis from 'ioredis';

describe('RedisHealthIndicator', () => {
  it('returns up status when PING succeeds', async () => {
    const redis = { ping: vi.fn().mockResolvedValue('PONG') } as unknown as Redis;
    const indicator = new RedisHealthIndicator(redis);
    const result = await indicator.isHealthy();
    expect(result).toEqual({ redis: { status: 'up' } });
  });

  it('throws HealthCheckError when PING fails', async () => {
    const redis = {
      ping: vi.fn().mockRejectedValue(new Error('Connection refused')),
    } as unknown as Redis;
    const indicator = new RedisHealthIndicator(redis);
    await expect(indicator.isHealthy()).rejects.toThrow(HealthCheckError);
  });
});
