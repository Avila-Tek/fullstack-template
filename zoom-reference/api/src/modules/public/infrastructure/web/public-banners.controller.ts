import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { BannerPayload } from '@zoom/schemas';
import { Public } from '../../../../shared/guards/public.decorator';
import { GetPublicBannersUseCasePort } from '../../application/ports/in/get-public-banners.use-case.port';

@ApiTags('Public')
@Controller('public')
@Public()
export class PublicBannersController {
	constructor(private readonly useCase: GetPublicBannersUseCasePort) {}

	@Get('banners')
	@ApiOperation({ summary: 'Get active published banners grouped by type' })
	@ApiResponse({
		status: 200,
		description: 'Published banners split by mobile/desktop',
	})
	getBanners(): Promise<BannerPayload> {
		return this.useCase.execute();
	}
}
