import { describe, it, expect, vi } from 'vitest';
import { AuditLogListener } from '@/auth/infrastructure/listeners/audit-log.listener.js';
import { AuthSignedInEvent } from '@/auth/application/events/auth.events.js';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { PinoLogger } from 'nestjs-pino';

const mockLogger = { error: vi.fn(), warn: vi.fn(), info: vi.fn() } as unknown as PinoLogger;

function buildDb(insertFn = vi.fn().mockResolvedValue(undefined)) {
  return {
    insert: vi.fn().mockReturnValue({ values: insertFn }),
  } as unknown as NodePgDatabase;
}

describe('AuditLogListener', () => {
  it('inserts a record with hashed email and ip (not plain text)', async () => {
    const db = buildDb();
    const listener = new AuditLogListener(db, mockLogger);

    await listener.handle(
      new AuthSignedInEvent({
        userId: 'u1',
        email: 'user@example.com',
        sessionId: 'sess1',
        ip: '1.2.3.4',
        correlationId: 'corr1',
      }),
    );

    expect(db.insert).toHaveBeenCalled();
    const insertValues = vi.mocked(db.insert).mock.results[0].value.values;
    const calledWith = vi.mocked(insertValues).mock.calls[0][0] as Record<string, unknown>;

    // Plain email and IP must NOT be stored
    expect(calledWith.emailHash).not.toBe('user@example.com');
    expect(calledWith.ipHash).not.toBe('1.2.3.4');
    // Hashes must be SHA-256 hex (64 chars)
    expect(String(calledWith.emailHash)).toHaveLength(64);
    expect(String(calledWith.ipHash)).toHaveLength(64);
  });

  it('does NOT throw if the DB insert fails', async () => {
    const db = buildDb(vi.fn().mockRejectedValue(new Error('DB down')));
    const listener = new AuditLogListener(db, mockLogger);

    // Should not throw — audit log never blocks the auth flow
    await expect(
      listener.handle(new AuthSignedInEvent({ userId: 'u1' })),
    ).resolves.not.toThrow();
  });

  it('handles missing email and ip gracefully (stores null hashes)', async () => {
    const insertValues = vi.fn().mockResolvedValue(undefined);
    const db = buildDb(insertValues);
    const listener = new AuditLogListener(db, mockLogger);

    await listener.handle(new AuthSignedInEvent({ userId: 'u1' }));

    const calledWith = insertValues.mock.calls[0][0] as Record<string, unknown>;
    expect(calledWith.emailHash).toBeNull();
    expect(calledWith.ipHash).toBeNull();
  });
});
