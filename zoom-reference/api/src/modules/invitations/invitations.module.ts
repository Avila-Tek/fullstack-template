import { Module } from '@nestjs/common';
import { LOGGER_PORT } from '@zoom/utils';
import { PinoLogger } from 'nestjs-pino';
import { EmailModule } from '../email/infrastructure/email.module';
import { ProfilesModule } from '../profiles/profiles.module';
import { RegionModule } from '../region/region.module';
import { AcceptInvitationUseCasePort } from './application/ports/in/accept-invitation.use-case.port';
import { CancelInvitationUseCasePort } from './application/ports/in/cancel-invitation.use-case.port';
import { CheckInviteTokenUseCasePort } from './application/ports/in/check-invite-token.use-case.port';
import { PersistInvitationUseCasePort } from './application/ports/in/persist-invitation.use-case.port';
import { RejectInvitationUseCasePort } from './application/ports/in/reject-invitation.use-case.port';
import { ResendInvitationUseCasePort } from './application/ports/in/resend-invitation.use-case.port';
import { ValidateInvitationUseCasePort } from './application/ports/in/validate-invitation.use-case.port';
import { InvitationAcceptanceUnitOfWorkPort } from './application/ports/out/invitation-acceptance-unit-of-work.port';
import { InvitationCancellationUnitOfWorkPort } from './application/ports/out/invitation-cancellation-unit-of-work.port';
import { InvitationRejectionUnitOfWorkPort } from './application/ports/out/invitation-rejection-unit-of-work.port';
import { InvitationRepositoryPort } from './application/ports/out/invitation-repository.port';
import { InvitationRoleTemplateRepositoryPort } from './application/ports/out/invitation-role-template-repository.port';
import { InvitationUnitOfWorkPort } from './application/ports/out/invitation-unit-of-work.port';
import { AcceptInvitationUseCase } from './application/use-cases/accept-invitation.use-case';
import { CancelInvitationUseCase } from './application/use-cases/cancel-invitation.use-case';
import { CheckInviteTokenUseCase } from './application/use-cases/check-invite-token.use-case';
import { PersistInvitationUseCase } from './application/use-cases/persist-invitation.use-case';
import { RejectInvitationUseCase } from './application/use-cases/reject-invitation.use-case';
import { ResendInvitationUseCase } from './application/use-cases/resend-invitation.use-case';
import { ValidateInvitationUseCase } from './application/use-cases/validate-invitation.use-case';
import { InvitationsController } from './infrastructure/http/invitations.controller';
import { InvitationsInternalController } from './infrastructure/http/invitations-internal.controller';
import { DrizzleInvitationAcceptanceUnitOfWorkAdapter } from './infrastructure/persistence/drizzle-invitation-acceptance-unit-of-work.adapter';
import { DrizzleInvitationCancellationUnitOfWorkAdapter } from './infrastructure/persistence/drizzle-invitation-cancellation-unit-of-work.adapter';
import { DrizzleInvitationRejectionUnitOfWorkAdapter } from './infrastructure/persistence/drizzle-invitation-rejection-unit-of-work.adapter';
import { DrizzleInvitationRepositoryAdapter } from './infrastructure/persistence/drizzle-invitation-repository.adapter';
import { DrizzleInvitationRoleTemplateRepositoryAdapter } from './infrastructure/persistence/drizzle-invitation-role-template-repository.adapter';
import { DrizzleInvitationUnitOfWorkAdapter } from './infrastructure/persistence/drizzle-invitation-unit-of-work.adapter';

@Module({
	imports: [RegionModule, ProfilesModule, EmailModule],
	controllers: [InvitationsInternalController, InvitationsController],
	providers: [
		{ provide: LOGGER_PORT, useExisting: PinoLogger },
		{
			provide: InvitationRepositoryPort,
			useClass: DrizzleInvitationRepositoryAdapter,
		},
		{
			provide: InvitationRoleTemplateRepositoryPort,
			useClass: DrizzleInvitationRoleTemplateRepositoryAdapter,
		},
		{
			provide: InvitationUnitOfWorkPort,
			useClass: DrizzleInvitationUnitOfWorkAdapter,
		},
		{
			provide: ValidateInvitationUseCasePort,
			useClass: ValidateInvitationUseCase,
		},
		{
			provide: PersistInvitationUseCasePort,
			useClass: PersistInvitationUseCase,
		},
		{
			provide: CheckInviteTokenUseCasePort,
			useClass: CheckInviteTokenUseCase,
		},
		{
			provide: AcceptInvitationUseCasePort,
			useClass: AcceptInvitationUseCase,
		},
		{
			provide: InvitationAcceptanceUnitOfWorkPort,
			useClass: DrizzleInvitationAcceptanceUnitOfWorkAdapter,
		},
		{
			provide: RejectInvitationUseCasePort,
			useClass: RejectInvitationUseCase,
		},
		{
			provide: CancelInvitationUseCasePort,
			useClass: CancelInvitationUseCase,
		},
		{
			provide: InvitationCancellationUnitOfWorkPort,
			useClass: DrizzleInvitationCancellationUnitOfWorkAdapter,
		},
		{
			provide: ResendInvitationUseCasePort,
			useClass: ResendInvitationUseCase,
		},
		{
			provide: InvitationRejectionUnitOfWorkPort,
			useClass: DrizzleInvitationRejectionUnitOfWorkAdapter,
		},
	],
})
export class InvitationsModule {}
