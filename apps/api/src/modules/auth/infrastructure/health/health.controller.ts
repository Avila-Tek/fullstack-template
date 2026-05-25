import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
	HealthCheck,
	type HealthCheckResult,
	HealthCheckService,
} from '@nestjs/terminus';
import { AuthHealthIndicator } from './auth.health-indicator';
import { DatabaseHealthIndicator } from './database.health-indicator';
import { RedisHealthIndicator } from './redis.health-indicator';

@ApiTags('Health')
@Controller('health')
export class HealthController {
	constructor(
		private readonly health: HealthCheckService,
		private readonly db: DatabaseHealthIndicator,
		private readonly redis: RedisHealthIndicator,
		private readonly auth: AuthHealthIndicator,
	) {}

	@Get()
	@ApiOperation({ summary: 'Liveness probe — always 200' })
	liveness(): { status: string } {
		return { status: 'ok' };
	}

	@Get('ready')
	@HealthCheck()
	@ApiOperation({
		summary:
			'Readiness probe — checks PostgreSQL, Redis, BetterAuth session store',
	})
	readiness(): Promise<HealthCheckResult> {
		return this.health.check([
			() => this.db.isHealthy('database'),
			() => this.redis.isHealthy('redis'),
			() => this.auth.isHealthy('betterAuth'),
		]);
	}
}
