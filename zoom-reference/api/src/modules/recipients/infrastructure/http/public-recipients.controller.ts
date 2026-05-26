import {
	Body,
	Controller,
	Get,
	HttpCode,
	Inject,
	Param,
	ParseUUIDPipe,
	Patch,
	Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
	listRecipientsQuerySchema,
	listRecipientsResponseSchema,
	type TListRecipientsResponse,
	toggleFavoriteInputSchema,
	toggleFavoriteOutputSchema,
} from '@zoom/schemas';
import {
	ApiErrorResponses,
	ApiSafeResponse,
	ApiZodBody,
	ApiZodQuery,
	createZodDto,
} from '@zoom/swagger';
import { CurrentPermissions } from '../../../../shared/guards/current-permissions.decorator';
import {
	CurrentUser,
	type JwtUser,
} from '../../../../shared/guards/current-user.decorator';
import type { ResolvedPermissions } from '../../../../shared/permissions/resolved-permissions.type';
import { ListRecipientsUseCasePort } from '../../application/ports/in/list-recipients.use-case.port';
import type { ToggleFavoriteResult } from '../../application/ports/in/toggle-favorite.use-case.port';
import { ToggleFavoriteUseCasePort } from '../../application/ports/in/toggle-favorite.use-case.port';

class ListRecipientsQueryDto extends createZodDto(listRecipientsQuerySchema) {}

class ToggleFavoriteBodyDto extends createZodDto(toggleFavoriteInputSchema) {}

@ApiBearerAuth()
@ApiTags('Recipients')
@Controller('recipients')
export class PublicRecipientsController {
	constructor(
		@Inject(ListRecipientsUseCasePort)
		private readonly listUseCase: ListRecipientsUseCasePort,
		@Inject(ToggleFavoriteUseCasePort)
		private readonly toggleFavoriteUseCase: ToggleFavoriteUseCasePort,
	) {}

	@Get()
	@ApiOperation({
		summary: 'List recipients with pagination, search, and filters',
	})
	@ApiZodQuery(listRecipientsQuerySchema.shape)
	@ApiSafeResponse(listRecipientsResponseSchema)
	@ApiErrorResponses(400, 401, 404, 500)
	list(
		@CurrentUser() user: JwtUser,
		@CurrentPermissions() perms: ResolvedPermissions | undefined,
		@Query() query: ListRecipientsQueryDto,
	): Promise<TListRecipientsResponse> {
		return this.listUseCase.execute({
			userId: user.sub,
			query,
			permissions: this.extractSharePermissions(perms),
		});
	}

	@Patch(':id/favorite')
	@HttpCode(200)
	@ApiOperation({ summary: 'Toggle favorite status on a recipient' })
	@ApiZodBody(toggleFavoriteInputSchema)
	@ApiSafeResponse(toggleFavoriteOutputSchema, 200)
	@ApiErrorResponses(400, 401, 404, 500)
	toggleFavorite(
		@Param('id', new ParseUUIDPipe()) id: string,
		@CurrentUser() user: JwtUser,
		@CurrentPermissions() perms: ResolvedPermissions | undefined,
		@Body() body: ToggleFavoriteBodyDto,
	): Promise<ToggleFavoriteResult> {
		return this.toggleFavoriteUseCase.execute({
			recipientId: id,
			starred: body.starred,
			userId: user.sub,
			permissions: this.extractSharePermissions(perms),
		});
	}

	private extractSharePermissions(perms: ResolvedPermissions | undefined): {
		hasShareGuide: boolean;
		hasShareLocker: boolean;
	} {
		return {
			hasShareGuide:
				perms?.functional.get('share_guide_recipients')?.allowed ?? false,
			hasShareLocker:
				perms?.functional.get('share_locker_recipients')?.allowed ?? false,
		};
	}
}
