import { Module } from '@nestjs/common';
import { CreateUserPort } from './application/ports/in/CreateUserPort';
import { UserRepository } from './application/ports/out/UserRepository';
import { CreateUserUseCase } from './application/use-cases/RegisterUserUseCase';
import { UserRepositoryAdapter } from './infrastructure/persistence/UserRepositoryAdapter';
import { UserController } from './infrastructure/web/UserController';
import { GetUserByEmailUseCase } from './application/use-cases/GetUserByEmailUseCase';
import { GetUserByEmailPort } from './application/ports/in/GetUserByEmailPort';
import { GetUserByEmailService } from './infrastructure/services/GetUserByEmailService';

@Module({
	providers: [
		GetUserByEmailService,
		{ provide: CreateUserPort, useClass: CreateUserUseCase },
		{ provide: UserRepository, useClass: UserRepositoryAdapter },
		{ provide: GetUserByEmailPort, useClass: GetUserByEmailUseCase },
	],
	controllers: [UserController],
	exports: [CreateUserPort, GetUserByEmailPort],
})
export class UsersModule {}
