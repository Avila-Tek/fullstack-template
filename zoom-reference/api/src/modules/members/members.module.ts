import { Module } from '@nestjs/common';
import { LOGGER_PORT } from '@zoom/utils';
import { PinoLogger } from 'nestjs-pino';
import { EmailModule } from '../email/infrastructure/email.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { GetMemberProfileUseCasePort } from './application/ports/in/get-member-profile.use-case.port';
import { ListMembersUseCasePort } from './application/ports/in/list-members.use-case.port';
import { ReactivateCollaboratorUseCasePort } from './application/ports/in/reactivate-collaborator.use-case.port';
import { RemoveCollaboratorUseCasePort } from './application/ports/in/remove-collaborator.use-case.port';
import { SuspendCollaboratorUseCasePort } from './application/ports/in/suspend-collaborator.use-case.port';
import { MemberListRepositoryPort } from './application/ports/out/member-list-repository.port';
import { MemberProfileRepositoryPort } from './application/ports/out/member-profile-repository.port';
import { GetMemberProfileUseCase } from './application/use-cases/get-member-profile.use-case';
import { ListMembersUseCase } from './application/use-cases/list-members.use-case';
import { ReactivateCollaboratorUseCase } from './application/use-cases/reactivate-collaborator.use-case';
import { RemoveCollaboratorUseCase } from './application/use-cases/remove-collaborator.use-case';
import { SuspendCollaboratorUseCase } from './application/use-cases/suspend-collaborator.use-case';
import { MembersController } from './infrastructure/http/members.controller';
import { DrizzleMemberListRepository } from './infrastructure/persistence/drizzle-member-list.repository';
import { DrizzleMemberProfileRepository } from './infrastructure/persistence/drizzle-member-profile.repository';

@Module({
	imports: [ProfilesModule, EmailModule],
	controllers: [MembersController],
	providers: [
		{ provide: LOGGER_PORT, useExisting: PinoLogger },
		{ provide: ListMembersUseCasePort, useClass: ListMembersUseCase },
		{
			provide: MemberListRepositoryPort,
			useClass: DrizzleMemberListRepository,
		},
		{
			provide: SuspendCollaboratorUseCasePort,
			useClass: SuspendCollaboratorUseCase,
		},
		{
			provide: ReactivateCollaboratorUseCasePort,
			useClass: ReactivateCollaboratorUseCase,
		},
		{
			provide: RemoveCollaboratorUseCasePort,
			useClass: RemoveCollaboratorUseCase,
		},
		{
			provide: GetMemberProfileUseCasePort,
			useClass: GetMemberProfileUseCase,
		},
		{
			provide: MemberProfileRepositoryPort,
			useClass: DrizzleMemberProfileRepository,
		},
	],
})
export class MembersModule {}
