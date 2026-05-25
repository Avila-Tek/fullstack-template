import { Inject, Injectable } from '@nestjs/common';
import { HealthCheckError, HealthIndicator, HealthIndicatorResult } from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../database/drizzle.constants';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
  constructor(
    @Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase,
  ) {
    super();
  }

  async isHealthy(): Promise<HealthIndicatorResult> {
    try {
      await this.db.execute(sql`SELECT 1`);
      return this.getStatus('database', true);
    } catch (err) {
      throw new HealthCheckError(
        'Database check failed',
        this.getStatus('database', false, { message: (err as Error).message }),
      );
    }
  }
}
