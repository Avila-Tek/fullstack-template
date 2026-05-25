import { Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '@infra/database/drizzle.constants.js';
import {
  PasswordHistoryRepositoryPort,
  type PasswordHistoryEntry,
} from '@/auth/application/ports/out/password-history.repository.port.js';
import { passwordHistory } from './auth.schema.js';

@Injectable()
export class DrizzlePasswordHistoryAdapter extends PasswordHistoryRepositoryPort {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase,
  ) {
    super();
  }

  async findLastN(userId: string, n: number): Promise<PasswordHistoryEntry[]> {
    const rows = await this.db
      .select()
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt))
      .limit(n);

    return rows.map((r) => ({
      id: r.id,
      userId: r.userId,
      hashedPassword: r.hashedPassword,
      createdAt: r.createdAt,
    }));
  }

  async add(userId: string, hashedPassword: string): Promise<void> {
    await this.db.insert(passwordHistory).values({ userId, hashedPassword });
  }

  async pruneOldest(userId: string, keepCount: number): Promise<void> {
    const toKeep = await this.db
      .select({ id: passwordHistory.id })
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId))
      .orderBy(desc(passwordHistory.createdAt))
      .limit(keepCount);

    if (toKeep.length === 0) return;

    const keepIds = toKeep.map((r) => r.id);
    const allRows = await this.db
      .select({ id: passwordHistory.id })
      .from(passwordHistory)
      .where(eq(passwordHistory.userId, userId));

    for (const row of allRows) {
      if (!keepIds.includes(row.id)) {
        await this.db.delete(passwordHistory).where(eq(passwordHistory.id, row.id));
      }
    }
  }
}
