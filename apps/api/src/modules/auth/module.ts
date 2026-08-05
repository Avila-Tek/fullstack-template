import { Module } from '@nestjs/common';
import { SignInUseCase } from './application/use-case/SignInUseCase';
import { TokenGenerator } from './application/ports/out/TokenGenerator';
import { PasswordHasher } from './application/ports/out/PasswordHasher';
import { AuthController } from './infrastructure/web/AuthController';
import { JwtTokenGenerator } from './infrastructure/security/JwtTokenGenerator';
import { PasswordHasherAdapter } from './infrastructure/security/PasswordHasher';
import { GetUserByEmailAdapter } from './infrastructure/mediators/GetUserByEmail';
import { UsersModule } from '../user/module';

@Module({
	imports: [UsersModule],
	providers: [
		SignInUseCase,
		GetUserByEmailAdapter,
		{ provide: TokenGenerator, useClass: JwtTokenGenerator },
		{ provide: PasswordHasher, useClass: PasswordHasherAdapter },
	],
	controllers: [AuthController],
})
export class AuthModule {}
