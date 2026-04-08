import {
	MiddlewareConsumer,
	Module,
	NestModule,
	RequestMethod,
} from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { json } from 'express';
import { ChangePasswordUseCasePort } from './application/ports/in/change-password.use-case.port';
import { AccountRepositoryPort } from './application/ports/out/account-repository.port';
import { PasswordHashServicePort } from './application/ports/out/password-hash-service.port';
import { PasswordHistoryRepositoryPort } from './application/ports/out/password-history-repository.port';
import { SessionRepositoryPort } from './application/ports/out/session-repository.port';
import { TokenServicePort } from './application/ports/out/token-service.port';
import { UserRepositoryPort } from './application/ports/out/user-repository.port';
import { ChangePasswordUseCase } from './application/use-cases/change-password.use-case';
import { auth } from './infrastructure/better-auth/auth';
import { DrizzleAccountRepository } from './infrastructure/persistence/repositories/drizzle-account-repository.adapter';
import { DrizzlePasswordHistoryRepository } from './infrastructure/persistence/repositories/drizzle-password-history-repository.adapter';
import { DrizzleSessionRepository } from './infrastructure/persistence/repositories/drizzle-session-repository.adapter';
import { DrizzleUserRepository } from './infrastructure/persistence/repositories/drizzle-user-repository.adapter';
import { RedisModule } from './infrastructure/redis/redis.module';
import { Argon2HashAdapter } from './infrastructure/security/argon2-hash.adapter';
import { HmacTokenAdapter } from './infrastructure/security/hmac-token.adapter';
import { BetterAuthDocsModule } from './infrastructure/web/controllers/better-auth-docs.module';
import { ChangePasswordController } from './infrastructure/web/controllers/change-password.controller';
import { SigninIpRateLimitMiddleware } from './infrastructure/web/middlewares/signin-ip-rate-limit.middleware';
import { SignupIpRateLimitMiddleware } from './infrastructure/web/middlewares/signup-ip-rate-limit.middleware';

@Module({
	imports: [
		RedisModule,
		// Mounts Better Auth handler at /api/v1/auth/* and wires the middleware.
		AuthModule.forRoot({ auth }),
		// Virtual Better Auth route stubs for Swagger docs — excluded in production
		...(process.env.NODE_ENV === 'production' ? [] : [BetterAuthDocsModule]),
	],
	controllers: [ChangePasswordController],
	providers: [
		SigninIpRateLimitMiddleware,
		SignupIpRateLimitMiddleware,
		// Use cases
		{ provide: ChangePasswordUseCasePort, useClass: ChangePasswordUseCase },

		// Repository adapters
		{ provide: AccountRepositoryPort, useClass: DrizzleAccountRepository },
		{
			provide: PasswordHistoryRepositoryPort,
			useClass: DrizzlePasswordHistoryRepository,
		},
		{ provide: SessionRepositoryPort, useClass: DrizzleSessionRepository },
		{ provide: UserRepositoryPort, useClass: DrizzleUserRepository },

		// Service adapters
		{ provide: PasswordHashServicePort, useClass: Argon2HashAdapter },
		{ provide: TokenServicePort, useClass: HmacTokenAdapter },
	],
	exports: [],
})
export class IdentityModule implements NestModule {
	configure(consumer: MiddlewareConsumer): void {
		// Per-IP rate limit on the sign-up endpoint (5 attempts / hour)
		consumer.apply(SignupIpRateLimitMiddleware).forRoutes({
			path: 'api/v1/auth/sign-up/email',
			method: RequestMethod.POST,
		});

		// Per-IP rate limit on the sign-in endpoint (20 attempts / hour)
		consumer.apply(SigninIpRateLimitMiddleware).forRoutes({
			path: 'api/v1/auth/sign-in/email',
			method: RequestMethod.POST,
		});

		// JSON body parsing for all custom NestJS endpoints in the identity module.
		// Better Auth routes (/api/v1/auth/*) are excluded — they require raw body access.
		consumer
			.apply(json())
			.exclude({ path: 'api/v1/auth/(.*)', method: RequestMethod.ALL })
			.forRoutes('*');
	}
}
