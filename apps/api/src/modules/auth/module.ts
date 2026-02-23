import { Module } from '@nestjs/common';
import { SignInUseCase } from './application/use-case/SignInUseCase';
import { TokenGenerator } from './application/ports/out/TokenGenerator';
import { PasswordHasher } from './application/ports/out/PasswordHasher';
import { GetUserByEmailPort } from './application/ports/out/GetUserByEmail';
import { AuthController } from './infrastructure/web/AuthController';
import { JwtTokenGenerator } from './infrastructure/security/JwtTokenGenerator';
import { PasswordHasherAdapter } from './infrastructure/security/PasswordHasher';
import { GetUserByEmailAdapter } from './infrastructure/mediators/GetUserByEmail';

@Module({
  imports: [],
  providers: [
    SignInUseCase,
    { provide: GetUserByEmailPort, useClass: GetUserByEmailAdapter },
    { provide: TokenGenerator, useClass: JwtTokenGenerator },
    { provide: PasswordHasher, useClass: PasswordHasherAdapter },
  ],
  controllers: [AuthController],
})
export class AuthModule {}
