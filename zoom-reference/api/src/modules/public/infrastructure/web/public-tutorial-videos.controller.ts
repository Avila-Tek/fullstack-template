import { Controller, Get, Inject } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { TGetPublicTutorialVideoResponse } from '@zoom/schemas';
import { Public } from '../../../../shared/guards/public.decorator';
import type { GetPublicTutorialVideoUseCasePort } from '../../application/ports/in/get-public-tutorial-video.use-case.port';
import { GET_PUBLIC_TUTORIAL_VIDEO_USE_CASE } from '../../application/ports/in/get-public-tutorial-video.use-case.port';

@ApiTags('Public')
@Controller('public')
@Public()
export class PublicTutorialVideosController {
	constructor(
		@Inject(GET_PUBLIC_TUTORIAL_VIDEO_USE_CASE)
		private readonly useCase: GetPublicTutorialVideoUseCasePort,
	) {}

	@Get('tutorial-video')
	@ApiOperation({
		summary: 'Get the public home tutorial video',
		description:
			'Fetches the active tutorial video for the public home page. Only one active video can exist for public_home (enforced at the database level). Returns `{ video: null }` if no video has been published.',
		operationId: 'getPublicHomeTutorialVideo',
	})
	@ApiResponse({
		status: 200,
		description: 'Tutorial video retrieved successfully',
		schema: {
			example: {
				video: {
					id: '550e8400-e29b-41d4-a716-446655440000',
					section_key: 'public_home',
					title: 'Getting Started with Zoom',
					youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
					youtube_video_id: 'dQw4w9WgXcQ',
					description: 'Learn the basics of using Zoom Emprendedores',
					sort_order: 1,
					created_at: '2025-04-27T10:30:00Z',
					updated_at: '2025-04-27T10:30:00Z',
				},
			},
		},
	})
	@ApiResponse({
		status: 200,
		description: 'No tutorial video published for public home',
		schema: {
			example: {
				video: null,
			},
		},
	})
	async getTutorialVideo(): Promise<TGetPublicTutorialVideoResponse> {
		const video = await this.useCase.execute('public_home');
		return { video };
	}
}
