import {
	Controller,
	Get,
	Inject,
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
	changeEmailPendingResponse,
	type TChangeEmailPendingResponse,
} from '@zoom/schemas';
import { ApiErrorResponses, ApiSafeResponse } from '@zoom/swagger';
import { GetChangeEmailPendingUseCasePort } from '../../application/ports/in/get-change-email-pending.use-case.port';
import { type AuthSessionUser, AuthUser } from '../guards/auth-user.decorator';
import { SessionGuard } from '../guards/session.guard';

@ApiTags('Auth / Email')
@Controller('change-email')
export class ChangeEmailController {
	constructor(
		@Inject(GetChangeEmailPendingUseCasePort)
		private readonly getChangeEmailPending: GetChangeEmailPendingUseCasePort,
	) {}

	@Get('pending')
	@UseGuards(SessionGuard)
	@ApiOperation({
		summary: 'Check if the current user has a pending email change',
		description:
			'Returns whether a pending change-email request exists for the authenticated user ' +
			'and the email address the verification was sent to. ' +
			'Requires a valid session cookie.',
	})
	@ApiSafeResponse(changeEmailPendingResponse, 200, 'Pending status')
	@ApiErrorResponses(401)
	async getPendingStatus(
		@AuthUser() user: AuthSessionUser,
	): Promise<TChangeEmailPendingResponse> {
		if (!user) throw new UnauthorizedException();
		return this.getChangeEmailPending.execute(user.id);
	}
}
