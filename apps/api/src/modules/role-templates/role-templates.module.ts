import { Module } from '@nestjs/common';
import { GetRoleTemplateDetailUseCasePort } from './application/ports/in/get-role-template-detail.use-case.port';
import { ListRoleTemplatesUseCasePort } from './application/ports/in/list-role-templates.use-case.port';
import { RoleTemplateRepositoryPort } from './application/ports/out/role-template-repository.port';
import { GetRoleTemplateDetailUseCase } from './application/use-cases/get-role-template-detail.use-case';
import { ListRoleTemplatesUseCase } from './application/use-cases/list-role-templates.use-case';
import { RoleTemplatesController } from './infrastructure/http/role-templates.controller';
import { DrizzleRoleTemplateRepositoryAdapter } from './infrastructure/persistence/drizzle-role-template-repository.adapter';

@Module({
	controllers: [RoleTemplatesController],
	providers: [
		{
			provide: RoleTemplateRepositoryPort,
			useClass: DrizzleRoleTemplateRepositoryAdapter,
		},
		{
			provide: ListRoleTemplatesUseCasePort,
			useClass: ListRoleTemplatesUseCase,
		},
		{
			provide: GetRoleTemplateDetailUseCasePort,
			useClass: GetRoleTemplateDetailUseCase,
		},
	],
	exports: [RoleTemplateRepositoryPort],
})
export class RoleTemplatesModule {}
