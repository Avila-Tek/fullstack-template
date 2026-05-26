import {
	Body,
	Controller,
	HttpCode,
	Inject,
	Post,
	UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
	TPersistInvitationOutput,
	TValidateInvitationOutput,
} from '@zoom/schemas';
import {
	persistInvitationCommandSchema,
	persistInvitationOutputSchema,
	validateInvitationCommandSchema,
	validateInvitationOutputSchema,
} from '@zoom/schemas';
import {
	ApiErrorResponses,
	ApiSafeResponse,
	ApiZodBody,
	createZodDto,
} from '@zoom/swagger';
import { InternalServiceGuard } from '../../../../shared/guards/internal-service.guard';
import { Public } from '../../../../shared/guards/public.decorator';
import { PersistInvitationUseCasePort } from '../../application/ports/in/persist-invitation.use-case.port';
import { ValidateInvitationUseCasePort } from '../../application/ports/in/validate-invitation.use-case.port';

class ValidateInvitationBodyDto extends createZodDto(
	validateInvitationCommandSchema,
) {}

class PersistInvitationBodyDto extends createZodDto(
	persistInvitationCommandSchema,
) {}

@ApiTags('Invitations (Internal)')
@Controller('internal/invitations')
@Public()
@UseGuards(InternalServiceGuard)
export class InvitationsInternalController {
	constructor(
		@Inject(ValidateInvitationUseCasePort)
		private readonly validateUseCase: ValidateInvitationUseCasePort,
		@Inject(PersistInvitationUseCasePort)
		private readonly persistUseCase: PersistInvitationUseCasePort,
	) {}

	@Post('validate')
	@HttpCode(200)
	@ApiOperation({ summary: 'Validate invitation input against business rules' })
	@ApiZodBody(validateInvitationCommandSchema)
	@ApiSafeResponse(validateInvitationOutputSchema, 200)
	@ApiErrorResponses(400, 403, 409, 422, 500)
	validate(
		@Body() body: ValidateInvitationBodyDto,
	): Promise<TValidateInvitationOutput> {
		return this.validateUseCase.execute(body);
	}

	@Post('persist')
	@HttpCode(201)
	@ApiOperation({
		summary: 'Persist invitation, profile and permissions atomically',
	})
	@ApiZodBody(persistInvitationCommandSchema)
	@ApiSafeResponse(persistInvitationOutputSchema, 201)
	@ApiErrorResponses(400, 403, 500)
	persist(
		@Body() body: PersistInvitationBodyDto,
	): Promise<TPersistInvitationOutput> {
		return this.persistUseCase.execute(body);
	}
}
