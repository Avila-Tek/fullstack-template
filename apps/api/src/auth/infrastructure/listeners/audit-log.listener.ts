import { Inject, Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { createHash } from 'node:crypto';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../../../infrastructure/database/drizzle.constants.js';
import { authAuditLog } from '../persistence/auth.schema.js';
import type { AuthEvent } from '../../application/events/auth.events.js';

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex');
}

@Injectable()
export class AuditLogListener {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase,
    @InjectPinoLogger(AuditLogListener.name)
    private readonly logger: PinoLogger,
  ) {}

  // Handles ALL auth.* events — requires wildcard: true in EventEmitter config
  @OnEvent('auth.*', { async: true })
  async handle(event: AuthEvent): Promise<void> {
    try {
      const { payload } = event;
      await this.db.insert(authAuditLog).values({
        event: event.type,
        userId: payload.userId ?? null,
        // SHA-256 hash — NEVER store email or IP in plain text
        emailHash: payload.email
          ? sha256(payload.email.toLowerCase().trim())
          : null,
        ipHash: payload.ip ? sha256(payload.ip) : null,
        sessionId: payload.sessionId ?? null,
        correlationId: payload.correlationId ?? null,
        metadata: payload.metadata ?? {},
      });
    } catch (err) {
      // NEVER re-throw — audit log must not block the auth flow
      this.logger.error({ err, eventType: event.type }, 'audit_log_insert_failed');
    }
  }
}
