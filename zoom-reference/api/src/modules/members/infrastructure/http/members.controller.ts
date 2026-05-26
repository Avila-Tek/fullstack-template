import {
	Controller,
	Delete,
	Get,
	HttpCode,
	Inject,
	Param,
	ParseUUIDPipe,
	Post,
	Query,
	UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
	listMembersOutputSchema,
	listMembersQuerySchema,
	memberProfileDetailSchema,
	reactivateCollaboratorOutputSchema,
	removeCollaboratorOutputSchema,
	suspendCollaboratorOutputSchema,
	type TListMembersOutput,
	type TMemberProfileDetail,
	type TReactivateCollaboratorOutput,
	type TRemoveCollaboratorOutput,
	type TSuspendCollaboratorOutput,
} from '@zoom/schemas';
import {
	ApiErrorResponses,
	ApiSafeResponse,
	ApiZodQuery,
	createZodDto,
} from '@zoom/swagger';
import {
	CurrentUser,
	type JwtUser,
} from '../../../../shared/guards/current-user.decorator';
import { JwtAuthGuard } from '../../../../shared/guards/jwt-auth.guard';
import { GetMemberProfileUseCasePort } from '../../application/ports/in/get-member-profile.use-case.port';
import { ListMembersUseCasePort } from '../../application/ports/in/list-members.use-case.port';
import { ReactivateCollaboratorUseCasePort } from '../../application/ports/in/reactivate-collaborator.use-case.port';
import { RemoveCollaboratorUseCasePort } from '../../application/ports/in/remove-collaborator.use-case.port';
import { SuspendCollaboratorUseCasePort } from '../../application/ports/in/suspend-collaborator.use-case.port';

class ListMembersQueryDto extends createZodDto(listMembersQuerySchema) {}

@ApiBearerAuth()
@ApiTags('Members')
@Controller('collaborators')
export class MembersController {
	constructor(
		@Inject(ListMembersUseCasePort)
		private readonly listUseCase: ListMembersUseCasePort,
		@Inject(SuspendCollaboratorUseCasePort)
		private readonly suspendUseCase: SuspendCollaboratorUseCasePort,
		@Inject(ReactivateCollaboratorUseCasePort)
		private readonly reactivateUseCase: ReactivateCollaboratorUseCasePort,
		@Inject(RemoveCollaboratorUseCasePort)
		private readonly removeUseCase: RemoveCollaboratorUseCasePort,
		@Inject(GetMemberProfileUseCasePort)
		private readonly getProfileUseCase: GetMemberProfileUseCasePort,
	) {}

	@Get()
	@ApiOperation({
		summary: 'List collaborators for the current business account',
	})
	@ApiZodQuery(listMembersQuerySchema.shape)
	@ApiSafeResponse(listMembersOutputSchema)
	@ApiErrorResponses(400, 401, 403, 422, 500)
	list(
		@CurrentUser() user: JwtUser,
		@Query() query: ListMembersQueryDto,
	): Promise<TListMembersOutput> {
		return this.listUseCase.execute(user.sub, query);
	}

	@Post(':id/suspend')
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
	@ApiOperation({ summary: 'Suspend a collaborator (owner only)' })
	@ApiSafeResponse(suspendCollaboratorOutputSchema, 200)
	@ApiErrorResponses(401, 403, 404, 422, 500)
	suspend(
		@Param('id', new ParseUUIDPipe()) id: string,
		@CurrentUser() user: JwtUser,
	): Promise<TSuspendCollaboratorOutput> {
		return this.suspendUseCase.execute({
			collaboratorProfileId: id,
			userId: user.sub,
		});
	}

	@Post(':id/reactivate')
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
	@ApiOperation({ summary: 'Reactivate a suspended collaborator (owner only)' })
	@ApiSafeResponse(reactivateCollaboratorOutputSchema, 200)
	@ApiErrorResponses(401, 403, 404, 422, 500)
	reactivate(
		@Param('id', new ParseUUIDPipe()) id: string,
		@CurrentUser() user: JwtUser,
	): Promise<TReactivateCollaboratorOutput> {
		return this.reactivateUseCase.execute({
			collaboratorProfileId: id,
			userId: user.sub,
		});
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get collaborator profile detail' })
	@ApiSafeResponse(memberProfileDetailSchema)
	@ApiErrorResponses(401, 403, 404, 500)
	getProfile(
		@CurrentUser() user: JwtUser,
		@Param('id', ParseUUIDPipe) id: string,
	): Promise<TMemberProfileDetail> {
		return this.getProfileUseCase.execute(user.sub, id);
	}

	@Delete(':id')
	@UseGuards(JwtAuthGuard)
	@HttpCode(200)
	@ApiOperation({
		summary: 'Remove a collaborator (owner only, logical delete)',
	})
	@ApiSafeResponse(removeCollaboratorOutputSchema, 200)
	@ApiErrorResponses(401, 403, 404, 422, 500)
	remove(
		@Param('id', new ParseUUIDPipe()) id: string,
		@CurrentUser() user: JwtUser,
	): Promise<TRemoveCollaboratorOutput> {
		return this.removeUseCase.execute({
			collaboratorProfileId: id,
			userId: user.sub,
		});
	}
}
