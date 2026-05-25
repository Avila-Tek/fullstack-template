import { describe, it, expect, vi } from 'vitest';
import { HealthCheckError } from '@nestjs/terminus';
import { AuthHealthIndicator } from '../../../infrastructure/health/auth.health-indicator';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

describe('AuthHealthIndicator', () => {
  it('returns up status when SELECT succeeds', async () => {
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as unknown as NodePgDatabase;
    const indicator = new AuthHealthIndicator(db);
    const result = await indicator.isHealthy();
    expect(result).toEqual({ authDb: { status: 'up' } });
  });

  it('throws HealthCheckError when query fails', async () => {
    const db = {
      select: vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          limit: vi.fn().mockRejectedValue(new Error('table not found')),
        }),
      }),
    } as unknown as NodePgDatabase;
    const indicator = new AuthHealthIndicator(db);
    await expect(indicator.isHealthy()).rejects.toThrow(HealthCheckError);
  });
});
