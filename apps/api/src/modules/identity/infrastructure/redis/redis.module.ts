import { Module, OnModuleDestroy } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
import Redis from 'ioredis';
import { auditLogger } from '../utils/audit-logger';
import { REDIS_CLIENT } from './redis.constants';

@Module({
	providers: [
		{
			provide: REDIS_CLIENT,
			useFactory: (): Redis => {
				const url = process.env.REDIS_URL ?? 'redis://localhost:6379';

				const client = new Redis(url, {
					lazyConnect: true,
					maxRetriesPerRequest: 1,
					enableOfflineQueue: false,
				});

				client.on('connect', () =>
					auditLogger.info({ event: 'redis.connected' }, 'Redis connected'),
				);
				client.on('error', (err: Error) =>
					auditLogger.warn(
						{ event: 'redis.error', message: err.message },
						'Redis error',
					),
				);

				client.connect().catch((err: Error) => {
					auditLogger.warn(
						{ event: 'redis.startup.warn', message: err.message },
						'Redis unavailable at startup',
					);
				});

				return client;
			},
		},
	],
	exports: [REDIS_CLIENT],
})
export class RedisModule implements OnModuleDestroy {
	constructor(private readonly moduleRef: ModuleRef) {}

	async onModuleDestroy(): Promise<void> {
		const client = this.moduleRef.get<Redis>(REDIS_CLIENT);
		await client.quit();
	}
}
