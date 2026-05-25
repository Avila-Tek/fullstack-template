import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { DatabaseHealthIndicator } from './database.health-indicator.js';
import { RedisHealthIndicator } from './redis.health-indicator.js';
import { AuthHealthIndicator } from './auth.health-indicator.js';
import { HealthController } from './health.controller.js';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [DatabaseHealthIndicator, RedisHealthIndicator, AuthHealthIndicator],
})
export class HealthModule {}
