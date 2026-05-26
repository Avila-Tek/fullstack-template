import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { RedisModule } from '../redis/redis.module';
import { AuthHealthIndicator } from './auth.health-indicator';
import { DatabaseHealthIndicator } from './database.health-indicator';
import { HealthController } from './health.controller';
import { RedisHealthIndicator } from './redis.health-indicator';

@Module({
	imports: [TerminusModule, RedisModule],
	controllers: [HealthController],
	providers: [
		DatabaseHealthIndicator,
		RedisHealthIndicator,
		AuthHealthIndicator,
	],
})
export class HealthModule {}
