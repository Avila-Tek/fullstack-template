import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { TokenGenerator } from './application/ports/out/TokenGenerator';
import { PasswordHasher } from './application/ports/out/PasswordHasher';
import { AuthController } from './infrastructure/web/AuthController';
import { JwtTokenGenerator } from './infrastructure/security/JwtTokenGenerator';
import { PasswordHasherAdapter } from './infrastructure/security/PasswordHasher';
import { SignInWithProviderPort } from './application/ports/in/SignInWithProviderPort';
import { SignUpWithProviderPort } from './application/ports/in/SignUpWithProviderPort';
import { SignInWithProviderUseCase } from './application/use-case/SignInWithProviderUseCase';
import { SignUpWithProviderUseCase } from './application/use-case/SignUpWithProviderUseCase';
import { AuthProviderFactoryPort } from './application/ports/out/AuthProviderFactoryPort';
import { AuthProviderFactoryImpl } from './infrastructure/providers/AuthProviderFactoryImpl';
import { CredentialsAuthProvider } from './infrastructure/providers/CredentialsAuthProvider';
import { AuthConfig } from './infrastructure/config/AuthConfig';

@Module({
  imports: [CqrsModule],
  providers: [
    AuthConfig,
    { provide: TokenGenerator, useClass: JwtTokenGenerator },
    { provide: PasswordHasher, useClass: PasswordHasherAdapter },
    {
      provide: SignInWithProviderPort,
      useClass: SignInWithProviderUseCase,
    },
    {
      provide: SignUpWithProviderPort,
      useClass: SignUpWithProviderUseCase,
    },
    {
      provide: AuthProviderFactoryPort,
      useClass: AuthProviderFactoryImpl,
    },
    CredentialsAuthProvider,
  ],
  controllers: [AuthController],
})
export class AuthModule {}
