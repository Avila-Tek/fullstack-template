import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DrizzlePasswordHistoryAdapter } from '../../../../auth/infrastructure/persistence/password-history.repository-adapter.js';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';

function buildDb(rows: unknown[] = []): NodePgDatabase {
  const selectValues = {
    from: vi.fn().mockReturnThis(),
    where: vi.fn().mockReturnThis(),
    orderBy: vi.fn().mockReturnThis(),
    limit: vi.fn().mockResolvedValue(rows),
  };
  return {
    select: vi.fn().mockReturnValue(selectValues),
    insert: vi.fn().mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    }),
    delete: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnThis(),
      orderBy: vi.fn().mockResolvedValue(undefined),
    }),
  } as unknown as NodePgDatabase;
}

describe('DrizzlePasswordHistoryAdapter', () => {
  it('findLastN queries with the correct userId and limit', async () => {
    const mockRows = [
      { id: '1', userId: 'u1', hashedPassword: '$hash', createdAt: new Date() },
    ];
    const db = buildDb(mockRows);
    const adapter = new DrizzlePasswordHistoryAdapter(db);

    const result = await adapter.findLastN('u1', 5);
    expect(result).toHaveLength(1);
    expect(result[0].userId).toBe('u1');
  });

  it('add inserts a new entry', async () => {
    const db = buildDb();
    const adapter = new DrizzlePasswordHistoryAdapter(db);
    await expect(adapter.add('u1', '$hash')).resolves.not.toThrow();
    expect(db.insert).toHaveBeenCalled();
  });
});
