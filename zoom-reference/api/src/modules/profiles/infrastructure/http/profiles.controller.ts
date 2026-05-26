import {
	Controller,
	Get,
	Header,
	Inject,
	Param,
	ParseUUIDPipe,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
	memberPermissionsReadSchema,
	profileMeOutputSchema,
	type TMemberPermissionsRead,
	type TProfileMeOutput,
} from '@zoom/schemas';
import { ApiErrorResponses, ApiSafeResponse } from '@zoom/swagger';
import type { JwtUser } from '../../../../shared/guards/current-user.decorator';
import { CurrentUser } from '../../../../shared/guards/current-user.decorator';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { GetMemberPermissionsUseCasePort } from '../../application/ports/in/get-member-permissions.use-case.port';
import { GetProfileMeUseCasePort } from '../../application/ports/in/get-profile-me.use-case.port';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@ApiTags('Profiles')
@Controller('profiles')
export class ProfilesController {
	constructor(
		@Inject(GetMemberPermissionsUseCasePort)
		private readonly getMemberPermissionsUseCase: GetMemberPermissionsUseCasePort,
		@Inject(GetProfileMeUseCasePort)
		private readonly getMeUseCase: GetProfileMeUseCasePort,
	) {}

	@Get('me')
	@ApiOperation({
		summary: 'Get profile completion status for the current user',
	})
	@ApiSafeResponse(profileMeOutputSchema, 200)
	@ApiErrorResponses(401, 500)
	getMe(@CurrentUser() user: JwtUser): Promise<TProfileMeOutput> {
		return this.getMeUseCase.execute(user.sub);
	}

	@Get(':id/permissions')
	@Header('Cache-Control', 'no-store')
	@ApiOperation({ summary: "Get a member's current permission set" })
	@ApiSafeResponse(memberPermissionsReadSchema)
	@ApiErrorResponses(401, 403, 500)
	getPermissions(
		@Param('id', new ParseUUIDPipe()) targetProfileId: string,
		@CurrentUser() user: JwtUser,
	): Promise<TMemberPermissionsRead> {
		return this.getMemberPermissionsUseCase.execute({
			targetProfileId,
			requestingUserId: user.sub,
		});
	}
}
