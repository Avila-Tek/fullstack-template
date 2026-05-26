import { Module } from '@nestjs/common';
import type { IStructuredLogger } from '@zoom/utils';
import { LOGGER_PORT } from '@zoom/utils';
import { PinoLogger } from 'nestjs-pino';
import { env } from '../../env';
import { GetPublicBannersUseCasePort } from './application/ports/in/get-public-banners.use-case.port';
import { GET_PUBLIC_TUTORIAL_VIDEO_USE_CASE } from './application/ports/in/get-public-tutorial-video.use-case.port';
import { BannerCachePort } from './application/ports/out/banner-cache.port';
import { BannerStoragePort } from './application/ports/out/banner-storage.port';
import { TUTORIAL_VIDEO_CACHE_PORT } from './application/ports/out/tutorial-video-cache.port';
import { TUTORIAL_VIDEO_REPOSITORY_PORT } from './application/ports/out/tutorial-video-repository.port';
import { GetPublicBannersUseCase } from './application/use-cases/get-public-banners.use-case';
import { GetPublicTutorialVideoUseCase } from './application/use-cases/get-public-tutorial-video.use-case';
import {
	REDIS_CLIENT,
	RedisClientProvider,
} from './infrastructure/cache/redis.provider';
import { RedisBannerCacheAdapter } from './infrastructure/cache/redis-banner-cache.adapter';
import { RedisTutorialVideoCacheAdapter } from './infrastructure/cache/redis-tutorial-video-cache.adapter';
import { DrizzleTutorialVideoAdapter } from './infrastructure/persistence/drizzle-tutorial-video.adapter';
import { GcsBannerStorageAdapter } from './infrastructure/storage/gcs-banner-storage.adapter';
import { MockBannerStorageAdapter } from './infrastructure/storage/mock-banner-storage.adapter';
import { PublicBannersController } from './infrastructure/web/public-banners.controller';
import { PublicTutorialVideosController } from './infrastructure/web/public-tutorial-videos.controller';

@Module({
	controllers: [PublicBannersController, PublicTutorialVideosController],
	providers: [
		{ provide: LOGGER_PORT, useExisting: PinoLogger },
		RedisClientProvider,
		{
			provide: REDIS_CLIENT,
			useFactory: (r: RedisClientProvider) => r.client,
			inject: [RedisClientProvider],
		},
		{ provide: GetPublicBannersUseCasePort, useClass: GetPublicBannersUseCase },
		{
			provide: GET_PUBLIC_TUTORIAL_VIDEO_USE_CASE,
			useClass: GetPublicTutorialVideoUseCase,
		},
		{ provide: BannerCachePort, useClass: RedisBannerCacheAdapter },
		{
			provide: BannerStoragePort,
			useFactory: (logger?: IStructuredLogger): BannerStoragePort => {
				if (env.BANNERS_STORAGE_TYPE === 'mock') {
					return new MockBannerStorageAdapter();
				}
				return new GcsBannerStorageAdapter(logger);
			},
			inject: [{ token: LOGGER_PORT, optional: true }],
		},
		{
			provide: TUTORIAL_VIDEO_REPOSITORY_PORT,
			useClass: DrizzleTutorialVideoAdapter,
		},
		{
			provide: TUTORIAL_VIDEO_CACHE_PORT,
			useClass: RedisTutorialVideoCacheAdapter,
		},
	],
})
export class PublicModule {}
