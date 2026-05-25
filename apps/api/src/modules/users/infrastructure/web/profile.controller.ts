import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
	profileDetailResponseSchema,
	type TProfileDetailResponse,
} from '@zoom/schemas';
import { ApiErrorResponses, ApiSafeResponse } from '@zoom/swagger';
import type { JwtUser } from '../../../../shared/guards/current-user.decorator';
import { CurrentUser } from '../../../../shared/guards/current-user.decorator';
import { GetProfileDetailUseCasePort } from '../../application/ports/in/get-profile-detail.use-case.port';

@ApiBearerAuth()
@ApiTags('Profile')
@Controller('profile')
export class ProfileController {
	constructor(
		@Inject(GetProfileDetailUseCasePort)
		private readonly getProfileDetailUseCase: GetProfileDetailUseCasePort,
	) {}

	@Get()
	@ApiOperation({ summary: 'Get current user profile detail' })
	@ApiSafeResponse(profileDetailResponseSchema)
	@ApiErrorResponses(401, 403, 404, 500)
	getProfileDetail(
		@CurrentUser() user: JwtUser,
	): Promise<TProfileDetailResponse> {
		return this.getProfileDetailUseCase.execute(user.sub);
	}
}
