import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseHealthIndicator } from './database.health-indicator.js';
import { RedisHealthIndicator } from './redis.health-indicator.js';
import { AuthHealthIndicator } from './auth.health-indicator.js';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
    private readonly redis: RedisHealthIndicator,
    private readonly auth: AuthHealthIndicator,
  ) {}

  // Note: Add @Public() decorator in F3 once JwtAuthGuard is in place.
  @Get()
  @ApiOperation({ summary: 'Liveness probe — always 200 if app is running' })
  ping(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — 200 if DB + Redis + auth DB connected' })
  ready() {
    return this.health.check([
      () => this.db.isHealthy(),
      () => this.redis.isHealthy(),
      () => this.auth.isHealthy(),
    ]);
  }
}
