import { Injectable } from '@nestjs/common';
import type { TRoleTemplateDetailOutput } from '@zoom/schemas';
import { GetRoleTemplateDetailUseCasePort } from '../ports/in/get-role-template-detail.use-case.port';
import { RoleTemplateRepositoryPort } from '../ports/out/role-template-repository.port';

@Injectable()
export class GetRoleTemplateDetailUseCase
	implements GetRoleTemplateDetailUseCasePort
{
	constructor(private readonly repo: RoleTemplateRepositoryPort) {}

	execute(id: string): Promise<TRoleTemplateDetailOutput | null> {
		return this.repo.findById(id);
	}
}
