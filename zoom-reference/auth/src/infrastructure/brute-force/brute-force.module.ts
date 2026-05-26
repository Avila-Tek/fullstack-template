import { Module } from '@nestjs/common';
import { BruteForceServicePort } from '../../application/ports/out/brute-force-service.port';
import { RedisModule } from '../redis/redis.module';
import { RedisBruteForceAdapter } from './redis-brute-force.adapter';

@Module({
	imports: [RedisModule],
	providers: [
		{ provide: BruteForceServicePort, useClass: RedisBruteForceAdapter },
	],
	exports: [BruteForceServicePort],
})
export class BruteForceModule {}
