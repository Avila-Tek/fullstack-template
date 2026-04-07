import { Inject, Injectable } from '@nestjs/common';
import {
	HealthCheckError,
	HealthIndicator,
	type HealthIndicatorResult,
} from '@nestjs/terminus';
import { sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { DRIZZLE_CLIENT } from '../database/drizzle.module';

@Injectable()
export class DatabaseHealthIndicator extends HealthIndicator {
	constructor(@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase) {
		super();
	}

	async isHealthy(key: string): Promise<HealthIndicatorResult> {
		try {
			await this.db.execute(sql`SELECT 1`);
			return this.getStatus(key, true);
		} catch {
			throw new HealthCheckError(
				'Database check failed',
				this.getStatus(key, false),
			);
		}
	}
}
