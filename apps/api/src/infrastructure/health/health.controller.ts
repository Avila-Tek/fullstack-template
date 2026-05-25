import { Controller, Get } from '@nestjs/common';
import { HealthCheck, HealthCheckService } from '@nestjs/terminus';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { DatabaseHealthIndicator } from './database.health-indicator';

@ApiTags('health')
@Controller('health')
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly db: DatabaseHealthIndicator,
  ) {}

  // Note: Add @Public() decorator in F3 once JwtAuthGuard is in place.
  @Get()
  @ApiOperation({ summary: 'Liveness probe — always 200 if app is running' })
  ping(): { status: string } {
    return { status: 'ok' };
  }

  @Get('ready')
  @HealthCheck()
  @ApiOperation({ summary: 'Readiness probe — 200 if DB is connected, 503 otherwise' })
  ready() {
    return this.health.check([() => this.db.isHealthy()]);
  }
}
