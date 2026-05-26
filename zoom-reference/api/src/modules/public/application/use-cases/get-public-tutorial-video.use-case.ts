import { Inject, Injectable } from '@nestjs/common';
import type { TTutorialVideoItem } from '@zoom/schemas';
import { InjectPinoLogger } from 'nestjs-pino';
import type { Logger } from 'pino';
import { env } from '../../../../env';
import type { GetPublicTutorialVideoUseCasePort } from '../ports/in/get-public-tutorial-video.use-case.port';
import type { TutorialVideoCachePort } from '../ports/out/tutorial-video-cache.port';
import { TUTORIAL_VIDEO_CACHE_PORT } from '../ports/out/tutorial-video-cache.port';
import type { TutorialVideoRepositoryPort } from '../ports/out/tutorial-video-repository.port';
import { TUTORIAL_VIDEO_REPOSITORY_PORT } from '../ports/out/tutorial-video-repository.port';

const CACHE_KEY_PREFIX = 'public:tutorial-video:';
const DEFAULT_TTL = env.TUTORIAL_VIDEO_CACHE_TTL_SECONDS ?? 3600;

@Injectable()
export class GetPublicTutorialVideoUseCase
	implements GetPublicTutorialVideoUseCasePort
{
	constructor(
		@Inject(TUTORIAL_VIDEO_REPOSITORY_PORT)
		private readonly repository: TutorialVideoRepositoryPort,
		@Inject(TUTORIAL_VIDEO_CACHE_PORT)
		private readonly cache: TutorialVideoCachePort,
		@InjectPinoLogger() private readonly logger: Logger,
	) {}

	async execute(section: string): Promise<TTutorialVideoItem | null> {
		const cacheKey = `${CACHE_KEY_PREFIX}${section}`;

		// Try cache first
		const cached = await this.cache.get(cacheKey);
		if (cached) {
			this.logger.info({ section, cacheKey }, 'Tutorial video cache hit');
			return cached;
		}

		// Cache miss — fetch from repository
		this.logger.info({ section, cacheKey }, 'Tutorial video cache miss');
		let video: TTutorialVideoItem | null;
		try {
			video = await this.repository.findBySection(section);
		} catch (error) {
			this.logger.warn(
				{ error, section, context: 'tutorial_video_repository_error' },
				'Failed to fetch tutorial video from repository',
			);
			return null;
		}

		if (video) {
			// Only cache found videos, not nulls (to avoid null poisoning)
			try {
				await this.cache.set(cacheKey, video, DEFAULT_TTL);
			} catch (error) {
				this.logger.warn(
					{ error, section, context: 'tutorial_video_cache_set_error' },
					'Failed to cache tutorial video, but returning fetched data',
				);
			}
		}

		return video;
	}
}
