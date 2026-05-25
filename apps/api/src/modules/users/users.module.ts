import { Module } from '@nestjs/common';
import { LOGGER_PORT } from '@zoom/utils';
import { PinoLogger } from 'nestjs-pino';
import { ProfilesModule } from '../profiles/profiles.module';
import { GetCurrentUserUseCasePort } from './application/ports/in/get-current-user.use-case.port';
import { GetProfileDetailUseCasePort } from './application/ports/in/get-profile-detail.use-case.port';
import { GetCurrentUserUseCase } from './application/use-cases/get-current-user.use-case';
import { GetProfileDetailUseCase } from './application/use-cases/get-profile-detail.use-case';
import { ProfileController } from './infrastructure/web/profile.controller';
import { UsersController } from './infrastructure/web/users.controller';

@Module({
	imports: [ProfilesModule],
	controllers: [UsersController, ProfileController],
	providers: [
		{ provide: LOGGER_PORT, useExisting: PinoLogger },
		{
			provide: GetCurrentUserUseCasePort,
			useClass: GetCurrentUserUseCase,
		},
		{
			provide: GetProfileDetailUseCasePort,
			useClass: GetProfileDetailUseCase,
		},
	],
})
export class UsersModule {}
