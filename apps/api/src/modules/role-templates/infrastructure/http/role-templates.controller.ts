import { Controller, Get, Inject, Param, ParseUUIDPipe } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import {
	roleTemplateDetailOutputSchema,
	roleTemplatesListOutputSchema,
	type TRoleTemplateDetailOutput,
	type TRoleTemplatesListOutput,
} from '@zoom/schemas';
import { ApiErrorResponses, ApiSafeResponse } from '@zoom/swagger';
import { GetRoleTemplateDetailUseCasePort } from '../../application/ports/in/get-role-template-detail.use-case.port';
import { ListRoleTemplatesUseCasePort } from '../../application/ports/in/list-role-templates.use-case.port';
import { RoleTemplateNotFoundException } from '../../domain/exceptions/role-template-not-found.exception';

@ApiTags('Role Templates')
@Controller('role-templates')
export class RoleTemplatesController {
	constructor(
		@Inject(ListRoleTemplatesUseCasePort)
		private readonly listUseCase: ListRoleTemplatesUseCasePort,
		@Inject(GetRoleTemplateDetailUseCasePort)
		private readonly detailUseCase: GetRoleTemplateDetailUseCasePort,
	) {}

	@Get()
	@ApiOperation({ summary: 'List all non-deleted role templates' })
	@ApiSafeResponse(roleTemplatesListOutputSchema)
	@ApiErrorResponses(401, 500)
	list(): Promise<TRoleTemplatesListOutput> {
		return this.listUseCase.execute();
	}

	@Get(':id')
	@ApiOperation({ summary: 'Get role template with services and permissions' })
	@ApiSafeResponse(roleTemplateDetailOutputSchema)
	@ApiErrorResponses(401, 404, 500)
	async getById(
		@Param('id', new ParseUUIDPipe()) id: string,
	): Promise<TRoleTemplateDetailOutput> {
		const detail = await this.detailUseCase.execute(id);
		if (detail === null) {
			throw new RoleTemplateNotFoundException({ roleTemplateId: id });
		}
		return detail;
	}
}
