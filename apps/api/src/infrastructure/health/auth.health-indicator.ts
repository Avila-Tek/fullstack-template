import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../database/drizzle.constants.js';
import { session } from '../../auth/infrastructure/persistence/auth.schema.js';

@Injectable()
export class AuthHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase,
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    try {
      await this.db.select().from(session).limit(1);
      return this.getStatus('authDb', true);
    } catch (err) {
      throw new HealthCheckError(
        'Auth DB check failed',
        this.getStatus('authDb', false, { message: (err as Error).message }),
      );
    }
  }
}
