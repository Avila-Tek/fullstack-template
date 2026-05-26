import { describe, it, expect, vi } from 'vitest';
import { HealthCheckError } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from '../../../infrastructure/health/database.health-indicator.js';

describe('DatabaseHealthIndicator', () => {
  it('returns up status when SELECT 1 succeeds', async () => {
    const drizzle = { execute: vi.fn().mockResolvedValue([]) } as unknown as never;
    const indicator = new DatabaseHealthIndicator(drizzle);

    const result = await indicator.isHealthy();
    expect(result).toEqual({ database: { status: 'up' } });
  });

  it('throws HealthCheckError when SELECT 1 fails', async () => {
    const drizzle = {
      execute: vi.fn().mockRejectedValue(new Error('Connection refused')),
    } as unknown as never;
    const indicator = new DatabaseHealthIndicator(drizzle);

    await expect(indicator.isHealthy()).rejects.toThrow(HealthCheckError);
  });
});
