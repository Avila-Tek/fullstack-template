import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
	HealthCheck,
	type HealthCheckResult,
	HealthCheckService,
} from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health-indicator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
	constructor(
		private readonly health: HealthCheckService,
		private readonly db: DatabaseHealthIndicator,
	) {}

	@Get()
	@ApiOperation({ summary: 'Liveness probe — always 200' })
	liveness(): { status: string } {
		return { status: 'ok' };
	}

	@Get('ready')
	@HealthCheck()
	@ApiOperation({ summary: 'Readiness probe — checks PostgreSQL' })
	readiness(): Promise<HealthCheckResult> {
		return this.health.check([() => this.db.isHealthy('database')]);
	}
}
