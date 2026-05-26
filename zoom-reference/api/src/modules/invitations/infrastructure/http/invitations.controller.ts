import {
	Controller,
	Get,
	HttpCode,
	Inject,
	Param,
	ParseUUIDPipe,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
	TAcceptInvitationOutput,
	TCancelInvitationOutput,
	TCheckInviteTokenOutput,
	TRejectInvitationOutput,
	TResendInvitationOutput,
} from '@zoom/schemas';
import {
	acceptInvitationOutputSchema,
	cancelInvitationOutputSchema,
	checkInviteTokenCommandSchema,
	checkInviteTokenOutputSchema,
	rejectInvitationOutputSchema,
	resendInvitationOutputSchema,
} from '@zoom/schemas';
import {
	ApiErrorResponses,
	ApiSafeResponse,
	ApiZodQuery,
	createZodDto,
} from '@zoom/swagger';
import type { JwtUser } from '../../../../shared/guards/current-user.decorator';
import { CurrentUser } from '../../../../shared/guards/current-user.decorator';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { Public } from '../../../../shared/guards/public.decorator';
import { AcceptInvitationUseCasePort } from '../../application/ports/in/accept-invitation.use-case.port';
import { CancelInvitationUseCasePort } from '../../application/ports/in/cancel-invitation.use-case.port';
import { CheckInviteTokenUseCasePort } from '../../application/ports/in/check-invite-token.use-case.port';
import { RejectInvitationUseCasePort } from '../../application/ports/in/reject-invitation.use-case.port';
import { ResendInvitationUseCasePort } from '../../application/ports/in/resend-invitation.use-case.port';

class CheckInviteTokenQueryDto extends createZodDto(
	checkInviteTokenCommandSchema,
) {}

@ApiTags('Invitations')
@Controller('invitations')
export class InvitationsController {
	constructor(
		@Inject(CheckInviteTokenUseCasePort)
		private readonly checkUseCase: CheckInviteTokenUseCasePort,
		@Inject(AcceptInvitationUseCasePort)
		private readonly acceptUseCase: AcceptInvitationUseCasePort,
		@Inject(RejectInvitationUseCasePort)
		private readonly rejectUseCase: RejectInvitationUseCasePort,
		@Inject(CancelInvitationUseCasePort)
		private readonly cancelUseCase: CancelInvitationUseCasePort,
		@Inject(ResendInvitationUseCasePort)
		private readonly resendUseCase: ResendInvitationUseCasePort,
	) {}

	@Get('check')
	@Public()
	@HttpCode(200)
	@ApiOperation({ summary: 'Check an invitation token status' })
	@ApiZodQuery(checkInviteTokenCommandSchema.shape)
	@ApiSafeResponse(checkInviteTokenOutputSchema, 200)
	@ApiErrorResponses(400, 500)
	check(
		@Query() query: CheckInviteTokenQueryDto,
	): Promise<TCheckInviteTokenOutput> {
		return this.checkUseCase.execute(query);
	}

	@Post(':id/accept')
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
	@ApiOperation({ summary: 'Accept an invitation' })
	@ApiSafeResponse(acceptInvitationOutputSchema, 200)
	@ApiErrorResponses(400, 401, 403, 404, 409, 500)
	accept(
		@Param('id', new ParseUUIDPipe()) id: string,
		@CurrentUser() user: JwtUser,
	): Promise<TAcceptInvitationOutput> {
		// NOTE: normalize user.email to lowercase — requires system-wide JWT email normalization first
		return this.acceptUseCase.execute({
			inviteId: id,
			userId: user.sub,
			normalizedEmail: user.email,
		});
	}

	@Post(':id/reject')
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
	@ApiOperation({ summary: 'Reject an invitation' })
	@ApiSafeResponse(rejectInvitationOutputSchema, 200)
	@ApiErrorResponses(400, 401, 403, 404, 409, 500)
	reject(
		@Param('id', new ParseUUIDPipe()) id: string,
		@CurrentUser() user: JwtUser,
	): Promise<TRejectInvitationOutput> {
		// NOTE: normalize user.email to lowercase — requires system-wide JWT email normalization first
		return this.rejectUseCase.execute({
			inviteId: id,
			userId: user.sub,
			normalizedEmail: user.email,
		});
	}

	@Post(':id/cancel')
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
	@ApiOperation({ summary: 'Cancel a pending invitation (owner only)' })
	@ApiSafeResponse(cancelInvitationOutputSchema, 200)
	@ApiErrorResponses(400, 401, 403, 404, 409, 500)
	cancel(
		@Param('id', new ParseUUIDPipe()) id: string,
		@CurrentUser() user: JwtUser,
	): Promise<TCancelInvitationOutput> {
		return this.cancelUseCase.execute({ inviteId: id, userId: user.sub });
	}

	@Post(':id/resend')
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
	@ApiOperation({ summary: 'Resend a pending invitation email (owner only)' })
	@ApiSafeResponse(resendInvitationOutputSchema, 200)
	@ApiErrorResponses(400, 401, 403, 404, 409, 500)
	resend(
		@Param('id', new ParseUUIDPipe()) id: string,
		@CurrentUser() user: JwtUser,
	): Promise<TResendInvitationOutput> {
		return this.resendUseCase.execute({ inviteId: id, userId: user.sub });
	}
}
