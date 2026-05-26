import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { env } from './env';

@Module({
	imports: [
		ThrottlerModule.forRootAsync({
			useFactory: () => ({
				throttlers: [
					{
						name: 'global',
						ttl: 60_000,
						limit: env.NODE_ENV === 'production' ? 100 : 1000,
					},
				],
			}),
		}),
	],
	providers: [
		{
			provide: APP_GUARD,
			useClass: ThrottlerGuard,
		},
	],
})
export class SecurityModule {}
