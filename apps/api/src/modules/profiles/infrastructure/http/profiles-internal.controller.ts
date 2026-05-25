import {
	Body,
	Controller,
	Get,
	HttpCode,
	Inject,
	ParseUUIDPipe,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import type {
	TCollaboratorEditContext,
	TEditContextResponse,
	TEditMemberProfileOutput,
	TPersistOnboardingOutput,
	TResolveEditLookupsOutput,
	TSyncProfileEmailOutput,
	TUpdateBusinessAccountOutput,
	TUpdateCollaboratorProfileOutput,
	TValidateOnboardingOutput,
} from '@zoom/schemas';
import {
	collaboratorEditContextSchema,
	editContextResponseSchema,
	editMemberProfileCommandSchema,
	editMemberProfileOutputSchema,
	persistOnboardingCommandSchema,
	persistOnboardingOutputSchema,
	resolveEditLookupsInputSchema,
	resolveEditLookupsOutputSchema,
	syncProfileEmailCommandSchema,
	syncProfileEmailOutputSchema,
	updateBusinessAccountCommandSchema,
	updateBusinessAccountOutputSchema,
	updateCollaboratorProfileCommandSchema,
	updateCollaboratorProfileOutputSchema,
	validateOnboardingInputSchema,
	validateOnboardingOutputSchema,
} from '@zoom/schemas';
import {
	ApiErrorResponses,
	ApiSafeResponse,
	ApiZodBody,
	createZodDto,
} from '@zoom/swagger';
import { InternalServiceGuard } from '../../../../shared/guards/internal-service.guard';
import { Public } from '../../../../shared/guards/public.decorator';
import { EditMemberProfileUseCasePort } from '../../application/ports/in/edit-member-profile.use-case.port';
import { GetCollaboratorEditContextUseCasePort } from '../../application/ports/in/get-collaborator-edit-context.use-case.port';
import { GetEditContextUseCasePort } from '../../application/ports/in/get-edit-context.use-case.port';
import { PersistOnboardingUseCasePort } from '../../application/ports/in/persist-onboarding.use-case.port';
import { ResolveEditLookupsUseCasePort } from '../../application/ports/in/resolve-edit-lookups.use-case.port';
import { SyncProfileEmailUseCasePort } from '../../application/ports/in/sync-profile-email.use-case.port';
import { UpdateBusinessAccountUseCasePort } from '../../application/ports/in/update-business-account.use-case.port';
import { UpdateCollaboratorProfileUseCasePort } from '../../application/ports/in/update-collaborator-profile.use-case.port';
import { ValidateOnboardingUseCasePort } from '../../application/ports/in/validate-onboarding.use-case.port';

class ValidateOnboardingBodyDto extends createZodDto(
	validateOnboardingInputSchema,
) {}
class PersistOnboardingBodyDto extends createZodDto(
	persistOnboardingCommandSchema,
) {}
class UpdateBusinessAccountBodyDto extends createZodDto(
	updateBusinessAccountCommandSchema,
) {}
class UpdateCollaboratorProfileBodyDto extends createZodDto(
	updateCollaboratorProfileCommandSchema,
) {}
class ResolveEditLookupsBodyDto extends createZodDto(
	resolveEditLookupsInputSchema,
) {}
class EditMemberProfileCommandDto extends createZodDto(
	editMemberProfileCommandSchema,
) {}

class SyncProfileEmailBodyDto extends createZodDto(
	syncProfileEmailCommandSchema,
) {}

@ApiTags('Profiles (Internal)')
@Controller('internal/profiles')
@Public()
@UseGuards(InternalServiceGuard)
export class ProfilesInternalController {
	constructor(
		@Inject(ValidateOnboardingUseCasePort)
		private readonly validateUseCase: ValidateOnboardingUseCasePort,
		@Inject(PersistOnboardingUseCasePort)
		private readonly persistUseCase: PersistOnboardingUseCasePort,
		@Inject(GetEditContextUseCasePort)
		private readonly getEditContextUseCase: GetEditContextUseCasePort,
		@Inject(UpdateBusinessAccountUseCasePort)
		private readonly updateBusinessAccountUseCase: UpdateBusinessAccountUseCasePort,
		@Inject(UpdateCollaboratorProfileUseCasePort)
		private readonly updateCollaboratorProfileUseCase: UpdateCollaboratorProfileUseCasePort,
		@Inject(ResolveEditLookupsUseCasePort)
		private readonly resolveEditLookupsUseCase: ResolveEditLookupsUseCasePort,
		@Inject(GetCollaboratorEditContextUseCasePort)
		private readonly getCollaboratorEditContextUseCase: GetCollaboratorEditContextUseCasePort,
		@Inject(EditMemberProfileUseCasePort)
		private readonly editMemberProfileUseCase: EditMemberProfileUseCasePort,
		@Inject(SyncProfileEmailUseCasePort)
		private readonly syncProfileEmailUseCase: SyncProfileEmailUseCasePort,
	) {}

	@Post('validate')
	@ApiOperation({ summary: 'Validate onboarding input against master data' })
	@ApiZodBody(validateOnboardingInputSchema)
	@ApiSafeResponse(validateOnboardingOutputSchema, 200)
	@ApiErrorResponses(400, 403, 422, 500)
	validate(
		@Body() body: ValidateOnboardingBodyDto,
	): Promise<TValidateOnboardingOutput> {
		return this.validateUseCase.execute(body);
	}

	@Post('persist')
	@ApiOperation({
		summary: 'Persist onboarding data into business account and profile',
	})
	@ApiZodBody(persistOnboardingCommandSchema)
	@ApiSafeResponse(persistOnboardingOutputSchema, 201)
	@ApiErrorResponses(400, 403, 409, 500)
	persist(
		@Body() body: PersistOnboardingBodyDto,
	): Promise<TPersistOnboardingOutput> {
		return this.persistUseCase.execute(body);
	}

	@Get('edit-context')
	@ApiOperation({ summary: 'Resolve edit saga context for a user' })
	@ApiSafeResponse(editContextResponseSchema, 200)
	@ApiErrorResponses(400, 403, 404, 500)
	getEditContext(
		@Query('userId', new ParseUUIDPipe()) userId: string,
	): Promise<TEditContextResponse> {
		return this.getEditContextUseCase.execute(userId);
	}

	@Post('update-business-account')
	@HttpCode(200)
	@ApiOperation({ summary: 'Atomic DB write for owner profile edits' })
	@ApiZodBody(updateBusinessAccountCommandSchema)
	@ApiSafeResponse(updateBusinessAccountOutputSchema, 200)
	@ApiErrorResponses(400, 403, 404, 422, 500)
	updateBusinessAccount(
		@Body() body: UpdateBusinessAccountBodyDto,
	): Promise<TUpdateBusinessAccountOutput> {
		return this.updateBusinessAccountUseCase.execute(body);
	}

	@Post('update-collaborator-profile')
	@HttpCode(200)
	@ApiOperation({ summary: 'Atomic DB write for member profile edits' })
	@ApiZodBody(updateCollaboratorProfileCommandSchema)
	@ApiSafeResponse(updateCollaboratorProfileOutputSchema, 200)
	@ApiErrorResponses(400, 404, 422, 500)
	updateCollaboratorProfile(
		@Body() body: UpdateCollaboratorProfileBodyDto,
	): Promise<TUpdateCollaboratorProfileOutput> {
		return this.updateCollaboratorProfileUseCase.execute(body);
	}

	@Post('resolve-edit-lookups')
	@HttpCode(200)
	@ApiOperation({
		summary: 'Resolve phonePrefixId and cityId for CORE sync',
	})
	@ApiZodBody(resolveEditLookupsInputSchema)
	@ApiSafeResponse(resolveEditLookupsOutputSchema, 200)
	@ApiErrorResponses(400, 500)
	resolveEditLookups(
		@Body() body: ResolveEditLookupsBodyDto,
	): Promise<TResolveEditLookupsOutput> {
		return this.resolveEditLookupsUseCase.execute(body);
	}

	@Get('collaborator-edit-context')
	@ApiOperation({ summary: 'Resolve edit context for a collaborator profile' })
	@ApiSafeResponse(collaboratorEditContextSchema, 200)
	@ApiErrorResponses(400, 403, 404, 500)
	getCollaboratorEditContext(
		@Query('callerUserId', new ParseUUIDPipe()) callerUserId: string,
		@Query('collaboratorProfileId', new ParseUUIDPipe())
		collaboratorProfileId: string,
	): Promise<TCollaboratorEditContext> {
		return this.getCollaboratorEditContextUseCase.execute(
			callerUserId,
			collaboratorProfileId,
		);
	}

	@Post('edit-member-profile')
	@HttpCode(200)
	@ApiOperation({
		summary: 'Atomic DB write for collaborator personal info edits',
	})
	@ApiZodBody(editMemberProfileCommandSchema)
	@ApiSafeResponse(editMemberProfileOutputSchema, 200)
	@ApiErrorResponses(400, 403, 404, 422, 500)
	editMemberProfile(
		@Body() body: EditMemberProfileCommandDto,
	): Promise<TEditMemberProfileOutput> {
		return this.editMemberProfileUseCase.execute(body);
	}

	@Post('sync-email')
	@HttpCode(200)
	@ApiOperation({
		summary: 'Sync business_profile.email to the identity email',
	})
	@ApiZodBody(syncProfileEmailCommandSchema)
	@ApiSafeResponse(syncProfileEmailOutputSchema, 200)
	@ApiErrorResponses(400, 403, 404, 500)
	syncProfileEmail(
		@Body() body: SyncProfileEmailBodyDto,
	): Promise<TSyncProfileEmailOutput> {
		return this.syncProfileEmailUseCase.execute(body);
	}
}
