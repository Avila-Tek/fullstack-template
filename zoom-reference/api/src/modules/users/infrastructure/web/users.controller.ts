import { Controller, Get, Inject } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
	currentUserResponseSchema,
	type TCurrentUserResponse,
} from '@zoom/schemas';
import { ApiErrorResponses, ApiSafeResponse } from '@zoom/swagger';
import type { JwtUser } from '../../../../shared/guards/current-user.decorator';
import { CurrentUser } from '../../../../shared/guards/current-user.decorator';
import { GetCurrentUserUseCasePort } from '../../application/ports/in/get-current-user.use-case.port';

@ApiBearerAuth()
@ApiTags('Users')
@Controller('users')
export class UsersController {
	constructor(
		@Inject(GetCurrentUserUseCasePort)
		private readonly getCurrentUserUseCase: GetCurrentUserUseCasePort,
	) {}

	@Get('current')
	@ApiOperation({ summary: 'Get current user summary' })
	@ApiSafeResponse(currentUserResponseSchema)
	@ApiErrorResponses(401, 404, 500)
	getCurrentUser(@CurrentUser() user: JwtUser): Promise<TCurrentUserResponse> {
		return this.getCurrentUserUseCase.execute(user.sub);
	}
}
