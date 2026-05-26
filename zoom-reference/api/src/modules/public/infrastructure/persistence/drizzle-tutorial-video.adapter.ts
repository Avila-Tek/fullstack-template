import { Inject, Injectable } from '@nestjs/common';
import type { TTutorialVideoItem } from '@zoom/schemas';
import { TutorialVideoItemSchema } from '@zoom/schemas';
import { and, asc, eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { InjectPinoLogger } from 'nestjs-pino';
import type { Logger } from 'pino';
import { DRIZZLE_CLIENT } from '../../../../infrastructure/database/drizzle.module';
import { TutorialVideoRepositoryPort } from '../../application/ports/out/tutorial-video-repository.port';
import { appSectionsEnum, appTutorialVideo } from './tutorial-video.schema';

@Injectable()
export class DrizzleTutorialVideoAdapter extends TutorialVideoRepositoryPort {
	constructor(
		@Inject(DRIZZLE_CLIENT) private readonly db: NodePgDatabase,
		@InjectPinoLogger() private readonly logger: Logger,
	) {
		super();
	}

	async findBySection(section: string): Promise<TTutorialVideoItem | null> {
		type AppSection = (typeof appSectionsEnum.enumValues)[number];
		const validSections: readonly string[] = appSectionsEnum.enumValues;
		if (!validSections.includes(section)) {
			this.logger.error(
				{ section },
				'Invalid section key passed to findBySection',
			);
			return null;
		}

		try {
			const videos = await this.db
				.select()
				.from(appTutorialVideo)
				.where(
					and(
						eq(appTutorialVideo.section_key, section as AppSection),
						eq(appTutorialVideo.is_deleted, false),
					),
				)
				.orderBy(
					asc(appTutorialVideo.sort_order),
					asc(appTutorialVideo.created_at),
				)
				.limit(1);

			if (videos.length === 0) {
				return null;
			}

			const parsed = TutorialVideoItemSchema.safeParse(videos[0]);
			if (!parsed.success) {
				this.logger.error(
					{
						section,
						error: parsed.error.message,
						context: 'tutorial_video_schema_validation_error',
					},
					'Database row failed Zod validation',
				);
				return null;
			}

			return parsed.data;
		} catch (error) {
			this.logger.error(
				{
					error,
					section,
					context: 'tutorial_video_database_error',
				},
				'Failed to fetch tutorial video from database',
			);
			throw error;
		}
	}
}
