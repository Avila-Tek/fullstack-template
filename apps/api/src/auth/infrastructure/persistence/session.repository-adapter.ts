import { Inject, Injectable } from '@nestjs/common';
import { and, eq, ne } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../infrastructure/database/drizzle.constants.js';
import {
  SessionRepositoryPort,
  type SessionRecord,
} from '../../application/ports/out/session.repository.port.js';
import { session } from './auth.schema.js';

@Injectable()
export class DrizzleSessionRepositoryAdapter extends SessionRepositoryPort {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase,
  ) {
    super();
  }

  async findById(sessionId: string): Promise<SessionRecord | null> {
    const rows = await this.db
      .select()
      .from(session)
      .where(eq(session.id, sessionId))
      .limit(1);

    if (rows.length === 0) return null;
    const r = rows[0];
    return {
      id: r.id,
      userId: r.userId,
      createdAt: r.createdAt,
      expiresAt: r.expiresAt,
    };
  }

  async deleteById(sessionId: string): Promise<void> {
    await this.db.delete(session).where(eq(session.id, sessionId));
  }

  async deleteByUserId(userId: string, exceptSessionId?: string): Promise<void> {
    if (exceptSessionId) {
      await this.db
        .delete(session)
        .where(and(eq(session.userId, userId), ne(session.id, exceptSessionId)));
    } else {
      await this.db.delete(session).where(eq(session.userId, userId));
    }
  }
}
