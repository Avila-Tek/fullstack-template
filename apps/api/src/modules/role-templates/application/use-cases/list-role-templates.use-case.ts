import { Injectable } from '@nestjs/common';
import type { TRoleTemplatesListOutput } from '@zoom/schemas';
import { ListRoleTemplatesUseCasePort } from '../ports/in/list-role-templates.use-case.port';
import { RoleTemplateRepositoryPort } from '../ports/out/role-template-repository.port';

@Injectable()
export class ListRoleTemplatesUseCase implements ListRoleTemplatesUseCasePort {
	constructor(private readonly repo: RoleTemplateRepositoryPort) {}

	execute(): Promise<TRoleTemplatesListOutput> {
		return this.repo.findAll();
	}
}
