import {
	MiddlewareConsumer,
	Module,
	type NestModule,
	RequestMethod,
} from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { AuthGuard, AuthModule } from '@thallesp/nestjs-better-auth';
import { LOGGER_PORT } from '@zoom/utils';
import { LoggerModule, PinoLogger } from 'nestjs-pino';
import { CaptchaServicePort } from '@/application/ports/out/captcha-service.port';
import { JwkRepositoryPort } from '@/application/ports/out/jwk-repository.port';
import { JwtMintServicePort } from '@/application/ports/out/jwt-mint-service.port';
import { OAuthSystemContextStorePort } from '@/application/ports/out/oauth-system-context-store.port';
import { PendingTermsStorePort } from '@/application/ports/out/pending-terms-store.port';
import { SystemKeyPort } from '@/application/ports/out/system-key-service.port';
import { SystemMembershipRepositoryPort } from '@/application/ports/out/system-membership-repository.port';
import { TermsRepositoryPort } from '@/application/ports/out/terms-repository.port';
import { VerificationRepositoryPort } from '@/application/ports/out/verification-repository.port';
import { CloudflareCaptchaAdapter } from '@/infrastructure/captcha/cloudflare-captcha-adapter';
import { DrizzleJwkRepository } from '@/infrastructure/database/repositories/drizzle-jwk-repository.adapter';
import { DrizzleSystemMembershipRepository } from '@/infrastructure/database/repositories/drizzle-system-membership-repository.adapter';
import { DrizzleTermsRepository } from '@/infrastructure/database/repositories/drizzle-terms-repository.adapter';
import { Es256JwtMintAdapter } from '@/infrastructure/jwt/es256-jwt-mint.adapter';
import { RedisPendingTermsStoreAdapter } from '@/infrastructure/redis/pending-terms-store.adapter';
import { RedisChangeEmailPendingAdapter } from '@/infrastructure/redis/redis-change-email-pending.adapter';
import { RedisOAuthSystemContextStoreAdapter } from '@/infrastructure/redis/redis-oauth-system-context-store.adapter';
import { RedisPasswordResetRateLimitAdapter } from '@/infrastructure/redis/redis-password-reset-rate-limit.adapter';
import { RedisTwoFactorPendingMethodAdapter } from '@/infrastructure/redis/redis-two-factor-pending-method.adapter';
import { RedisVerificationRepositoryAdapter } from '@/infrastructure/redis/redis-verification-repository.adapter';
import { DrizzleSystemKeyAdapter } from '@/infrastructure/system-key/drizzle-system-key.adapter';
import { SystemKeyMiddleware } from '@/infrastructure/system-key/system-key.middleware';
import { AcceptTermsUseCasePort } from './application/ports/in/accept-terms.use-case.port';
import { DeactivateSystemUseCasePort } from './application/ports/in/deactivate-system.use-case.port';
import { ForceRevokeSessionsUseCasePort } from './application/ports/in/force-revoke-sessions.use-case.port';
import { GetChangeEmailPendingUseCasePort } from './application/ports/in/get-change-email-pending.use-case.port';
import { GetSystemUseCasePort } from './application/ports/in/get-system.use-case.port';
import { GetTermsAcceptanceStatusUseCasePort } from './application/ports/in/get-terms-acceptance-status.use-case.port';
import { GetTokenUseCasePort } from './application/ports/in/get-token.use-case.port';
import { GrantSystemAccessUseCasePort } from './application/ports/in/grant-system-access.use-case.port';
import { ListSystemMembersUseCasePort } from './application/ports/in/list-system-members.use-case.port';
import { ListSystemsUseCasePort } from './application/ports/in/list-systems.use-case.port';
import { ListUserSessionsUseCasePort } from './application/ports/in/list-user-sessions.use-case.port';
import { ProvisionUserUseCasePort } from './application/ports/in/provision-user.use-case.port';
import { RegisterSystemUseCasePort } from './application/ports/in/register-system.use-case.port';
import { RevokeSystemAccessUseCasePort } from './application/ports/in/revoke-system-access.use-case.port';
import { RotateSystemKeyUseCasePort } from './application/ports/in/rotate-system-key.use-case.port';
import { UpdateMemberRoleUseCasePort } from './application/ports/in/update-member-role.use-case.port';
import { UpdateSystemUseCasePort } from './application/ports/in/update-system.use-case.port';
import { AccountRepositoryPort } from './application/ports/out/account-repository.port';
import { ApiKeyHashPort } from './application/ports/out/api-key-hash.port';
import { AuditLogServicePort } from './application/ports/out/audit-log-service.port';
import { BetterAuthOrgPort } from './application/ports/out/better-auth-org.port';
import { ChangeEmailAuditLogPort } from './application/ports/out/change-email-audit-log.port';
import { ChangeEmailPendingPort } from './application/ports/out/change-email-pending.port';
import { ChangePasswordAuditLogPort } from './application/ports/out/change-password-audit-log.port';
import { DeviceRepositoryPort } from './application/ports/out/device-repository.port';
import { EmailServicePort } from './application/ports/out/email-service.port';
import { ForceRevokeUnitOfWorkPort } from './application/ports/out/force-revoke-unit-of-work.port';
import { GrantAccessUnitOfWorkPort } from './application/ports/out/grant-access-unit-of-work.port';
import { PasswordHashServicePort } from './application/ports/out/password-hash-service.port';
import { PasswordHistoryRepositoryPort } from './application/ports/out/password-history-repository.port';
import { PasswordResetAuditLogPort } from './application/ports/out/password-reset-audit-log.port';
import { PasswordResetRateLimitPort } from './application/ports/out/password-reset-rate-limit.port';
import { SecurityNotificationPort } from './application/ports/out/security-notification.port';
import { SessionAuditLogRepositoryPort } from './application/ports/out/session-audit-log-repository.port';
import { SessionRepositoryPort } from './application/ports/out/session-repository.port';
import { SmsServicePort } from './application/ports/out/sms-service.port';
import { SystemAuditLogPort } from './application/ports/out/system-audit-log.port';
import { SystemRepositoryPort } from './application/ports/out/system-repository.port';
import { TokenServicePort } from './application/ports/out/token-service.port';
import { TwoFactorActivateUnitOfWorkPort } from './application/ports/out/two-factor-activate-unit-of-work.port';
import { TwoFactorAuditLogRepositoryPort } from './application/ports/out/two-factor-audit-log-repository.port';
import { TwoFactorPendingMethodPort } from './application/ports/out/two-factor-pending-method.port';
import { TwoFactorRepositoryPort } from './application/ports/out/two-factor-repository.port';
import { UserRepositoryPort } from './application/ports/out/user-repository.port';
import { UserTermsAcceptanceRepositoryPort } from './application/ports/out/user-terms-acceptance-repository.port';
import { AcceptTermsUseCase } from './application/use-cases/accept-terms.use-case';
import { DeactivateSystemUseCase } from './application/use-cases/deactivate-system.use-case';
import { ForceRevokeSessionsUseCase } from './application/use-cases/force-revoke-sessions.use-case';
import { GetChangeEmailPendingUseCase } from './application/use-cases/get-change-email-pending.use-case';
import { GetSystemUseCase } from './application/use-cases/get-system.use-case';
import { GetTermsAcceptanceStatusUseCase } from './application/use-cases/get-terms-acceptance-status.use-case';
import { GetTokenUseCase } from './application/use-cases/get-token.use-case';
import { GrantSystemAccessUseCase } from './application/use-cases/grant-system-access.use-case';
import { ListSystemMembersUseCase } from './application/use-cases/list-system-members.use-case';
import { ListSystemsUseCase } from './application/use-cases/list-systems.use-case';
import { ListUserSessionsUseCase } from './application/use-cases/list-user-sessions.use-case';
import { ProvisionUserUseCase } from './application/use-cases/provision-user.use-case';
import { RegisterSystemUseCase } from './application/use-cases/register-system.use-case';
import { RevokeSystemAccessUseCase } from './application/use-cases/revoke-system-access.use-case';
import { RotateSystemKeyUseCase } from './application/use-cases/rotate-system-key.use-case';
import { UpdateMemberRoleUseCase } from './application/use-cases/update-member-role.use-case';
import { UpdateSystemUseCase } from './application/use-cases/update-system.use-case';
import { env } from './env';
import { DrizzleAuditLogAdapter } from './infrastructure/audit-log/drizzle-audit-log-adapter';
import { auth } from './infrastructure/better-auth/auth';
import { BetterAuthOrgAdapter } from './infrastructure/better-auth/better-auth-org.adapter';
import { BruteForceModule } from './infrastructure/brute-force/brute-force.module';
import { DrizzleModule } from './infrastructure/database/drizzle.module';
import { DrizzleAccountRepository } from './infrastructure/database/repositories/drizzle-account-repository.adapter';
import { DrizzleChangeEmailAuditLogAdapter } from './infrastructure/database/repositories/drizzle-change-email-audit-log.adapter';
import { DrizzleChangePasswordAuditLogAdapter } from './infrastructure/database/repositories/drizzle-change-password-audit-log.adapter';
import { DrizzleDeviceRepositoryAdapter } from './infrastructure/database/repositories/drizzle-device-repository.adapter';
import { DrizzleForceRevokeUnitOfWorkAdapter } from './infrastructure/database/repositories/drizzle-force-revoke-unit-of-work.adapter';
import { DrizzleGrantAccessUnitOfWorkAdapter } from './infrastructure/database/repositories/drizzle-grant-access-unit-of-work.adapter';
import { DrizzlePasswordHistoryRepository } from './infrastructure/database/repositories/drizzle-password-history-repository.adapter';
import { DrizzlePasswordResetAuditLogAdapter } from './infrastructure/database/repositories/drizzle-password-reset-audit-log.adapter';
import { DrizzleSessionAuditLogRepository } from './infrastructure/database/repositories/drizzle-session-audit-log.adapter';
import { DrizzleSessionRepository } from './infrastructure/database/repositories/drizzle-session-repository.adapter';
import { DrizzleSystemAuditLogAdapter } from './infrastructure/database/repositories/drizzle-system-audit-log.adapter';
import { DrizzleSystemRepository } from './infrastructure/database/repositories/drizzle-system-repository.adapter';
import { DrizzleTwoFactorActivateUnitOfWorkAdapter } from './infrastructure/database/repositories/drizzle-two-factor-activate-unit-of-work.adapter';
import { DrizzleTwoFactorAuditLogAdapter } from './infrastructure/database/repositories/drizzle-two-factor-audit-log.adapter';
import { DrizzleTwoFactorRepository } from './infrastructure/database/repositories/drizzle-two-factor-repository.adapter';
import { DrizzleUserRepository } from './infrastructure/database/repositories/drizzle-user-repository.adapter';
import { DrizzleUserTermsAcceptanceRepository } from './infrastructure/database/repositories/drizzle-user-terms-acceptance-repository.adapter';
import { ZoomEmailAdapter } from './infrastructure/email/zoom-email.adapter';
import { AllExceptionsFilter } from './infrastructure/filters/all-exceptions.filter';
import { DomainExceptionFilter } from './infrastructure/filters/domain-exception.filter';
import { HttpExceptionFilter } from './infrastructure/filters/http-exception.filter';
import { AdminBearerGuard } from './infrastructure/guards/admin-bearer.guard';
import { InternalServiceGuard } from './infrastructure/guards/internal-service.guard';
import { PlatformAdminGuard } from './infrastructure/guards/platform-admin.guard';
import { SystemAdminGuard } from './infrastructure/guards/system-admin.guard';
import { Argon2HashAdapter } from './infrastructure/hash/argon2-hash-adapter';
import { HmacApiKeyHashAdapter } from './infrastructure/hash/hmac-api-key-hash.adapter';
import { HealthModule } from './infrastructure/health/health.module';
import { ChangeEmailHook } from './infrastructure/hooks/change-email.hook';
import { ChangePasswordHook } from './infrastructure/hooks/change-password.hook';
import { DeviceHook } from './infrastructure/hooks/device.hooks';
import { EmailVerificationHook } from './infrastructure/hooks/email-verification.hooks';
import { ForgetPasswordHook } from './infrastructure/hooks/forget-password.hooks';
import { PhoneNumberSendOtpHook } from './infrastructure/hooks/phone-number-send-otp.hook';
import { ResetPasswordHook } from './infrastructure/hooks/reset-password.hooks';
import { SignInHook } from './infrastructure/hooks/sign-in.hooks';
import { SignOutHook } from './infrastructure/hooks/sign-out.hooks';
import { SignUpHook } from './infrastructure/hooks/sign-up.hooks';
import { SocialCallbackHook } from './infrastructure/hooks/social-callback.hooks';
import { SocialSignInHook } from './infrastructure/hooks/social-sign-in.hooks';
import { TokenHook } from './infrastructure/hooks/token.hooks';
import { TwoFactorDisableHook } from './infrastructure/hooks/two-factor-disable.hook';
import { TwoFactorEnrollmentHook } from './infrastructure/hooks/two-factor-enrollment.hook';
import { TwoFactorOtpRateLimitHook } from './infrastructure/hooks/two-factor-otp-rate-limit.hook';
import { TwoFactorSendOtpHook } from './infrastructure/hooks/two-factor-send-otp.hook';
import { TwoFactorSkipHook } from './infrastructure/hooks/two-factor-skip.hook';
import { TwoFactorVerifyOtpHook } from './infrastructure/hooks/two-factor-verify-otp.hook';
import { TwoFactorVerifyTotpHook } from './infrastructure/hooks/two-factor-verify-totp.hook';
import { AdminSessionsController } from './infrastructure/http/admin-sessions.controller';
import { ChangeEmailController } from './infrastructure/http/change-email.controller';
import { JwksController } from './infrastructure/http/jwks.controller';
import { SystemMembersController } from './infrastructure/http/system-members.controller';
import { SystemsController } from './infrastructure/http/systems.controller';
import { TermsController } from './infrastructure/http/terms.controller';
import { TwoFactorStatusController } from './infrastructure/http/two-factor-status.controller';
import { UsersInternalController } from './infrastructure/http/users-internal.controller';
import { ApiResponseInterceptor } from './infrastructure/interceptors/api-response.interceptor';
import { DomainToHttpMapper } from './infrastructure/mapping/domain-to-http.mapper';
import { SecurityNotificationAdapter } from './infrastructure/notifications/security-notification.adapter';
import { RedisModule } from './infrastructure/redis/redis.module';
import { ZoomSmsAdapter } from './infrastructure/sms/zoom-sms.adapter';
import { BetterAuthDocsModule } from './infrastructure/swagger/better-auth-docs.module';
import { sentryScopeMiddleware } from './infrastructure/telemetry/sentry-scope.middleware';
import { SentryUserInterceptor } from './infrastructure/telemetry/sentry-user.interceptor';
import { HmacTokenAdapter } from './infrastructure/token/hmac-token-adapter';
import { ZoomAuthService } from './infrastructure/zoom/zoom-auth.service';
import { pinoHttpConfig } from './shared/logger/pino.config';

// Platform-admin routes are session-authenticated — they must NOT pass through
// SystemKeyMiddleware which is designed for system-to-system calls.
const SYSTEM_MGMT_ROUTE = { path: 'systems', method: RequestMethod.ALL };

const ADMIN_ROUTE = { path: 'admin', method: RequestMethod.ALL };

// Member management uses session auth, not system API key.
const MEMBERS_ROUTE = {
	path: 'systems/:id/members',
	method: RequestMethod.ALL,
};
const MEMBERS_USER_ROUTE = {
	path: 'systems/:id/members/:userId',
	method: RequestMethod.ALL,
};

// JWKS endpoint is public — clients fetch it to verify JWTs without an API key.
const JWKS_ROUTE = {
	path: 'auth/.well-known/*',
	method: RequestMethod.ALL,
};

// Internal user provisioning — guarded by x-service-secret, not system API key.
const INTERNAL_ROUTE = {
	path: 'internal/*',
	method: RequestMethod.ALL,
};

@Module({
	imports: [
		LoggerModule.forRoot(pinoHttpConfig('zoom-auth')),
		DrizzleModule,
		RedisModule,
		BruteForceModule,
		HealthModule,
		// Global rate limiter for custom NestJS endpoints (auth routes use Better Auth's own limiter)
		// RATE_LIMIT/RATE_TTL env vars tune the limiter; safe defaults (100 req / 60 s) apply when unset
		ThrottlerModule.forRoot([
			{
				ttl: env.RATE_TTL,
				limit: env.RATE_LIMIT,
			},
		]),
		// Mounts Better Auth handler at /auth/* and wires the middleware.
		// bodyParser is handled by the module — main.ts bootstraps with bodyParser:false.
		AuthModule.forRoot({
			auth,
			// Re-enable JSON body parsing for all custom NestJS endpoints.
			bodyParser: {
				json: { enabled: true },
			},
		}),
		// Virtual Better Auth route stubs for Swagger docs — excluded in production
		...(env.NODE_ENV === 'production' ? [] : [BetterAuthDocsModule]),
	],
	controllers: [
		AdminSessionsController,
		ChangeEmailController,
		JwksController,
		SystemMembersController,
		SystemsController,
		TermsController,
		TwoFactorStatusController,
		UsersInternalController,
	],
	providers: [
		// Outermost — forwards all exceptions to Sentry before domain/http filters handle them
		{ provide: APP_FILTER, useClass: SentryGlobalFilter },
		// Catches all uncaught errors and returns a structured 500 response
		{ provide: APP_FILTER, useClass: AllExceptionsFilter },
		// Middle filter — catches HttpException (guards, pipes, manual throws)
		{ provide: APP_FILTER, useClass: HttpExceptionFilter },
		// Inner filter — catches DomainException before HttpExceptionFilter sees it
		{ provide: APP_FILTER, useClass: DomainExceptionFilter },
		// Wraps all successful responses in the standard ApiResponse envelope
		{ provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
		// Reads request.session.user (populated by @thallesp/nestjs-better-auth
		// AuthGuard) and attaches it to the active Sentry isolation scope.
		// No-op on @AllowAnonymous() routes where no session exists.
		{ provide: APP_INTERCEPTOR, useClass: SentryUserInterceptor },

		// Apply NestJS throttler globally for all custom endpoints
		{ provide: APP_GUARD, useClass: ThrottlerGuard },
		// All routes require a valid session by default.
		// Use @AllowAnonymous() on controllers/routes that must be public.
		{ provide: APP_GUARD, useClass: AuthGuard },

		// Guards
		AdminBearerGuard,
		InternalServiceGuard,
		PlatformAdminGuard,
		SystemAdminGuard,

		// Mapper used by DomainExceptionFilter
		DomainToHttpMapper,
		{ provide: LOGGER_PORT, useExisting: PinoLogger },

		// Use cases
		{ provide: ApiKeyHashPort, useClass: HmacApiKeyHashAdapter },
		{
			provide: AcceptTermsUseCasePort,
			useFactory: (
				termsRepo: TermsRepositoryPort,
				acceptanceRepo: UserTermsAcceptanceRepositoryPort,
			) => new AcceptTermsUseCase(termsRepo, acceptanceRepo),
			inject: [TermsRepositoryPort, UserTermsAcceptanceRepositoryPort],
		},
		{
			provide: GetChangeEmailPendingUseCasePort,
			useClass: GetChangeEmailPendingUseCase,
		},
		{
			provide: GetTermsAcceptanceStatusUseCasePort,
			useClass: GetTermsAcceptanceStatusUseCase,
		},
		{ provide: DeactivateSystemUseCasePort, useClass: DeactivateSystemUseCase },
		{ provide: GetTokenUseCasePort, useClass: GetTokenUseCase },
		{ provide: GetSystemUseCasePort, useClass: GetSystemUseCase },
		{ provide: ListSystemsUseCasePort, useClass: ListSystemsUseCase },
		{ provide: RegisterSystemUseCasePort, useClass: RegisterSystemUseCase },
		{ provide: RotateSystemKeyUseCasePort, useClass: RotateSystemKeyUseCase },
		{
			provide: ForceRevokeSessionsUseCasePort,
			useClass: ForceRevokeSessionsUseCase,
		},
		{ provide: ListUserSessionsUseCasePort, useClass: ListUserSessionsUseCase },
		{ provide: UpdateSystemUseCasePort, useClass: UpdateSystemUseCase },
		{
			provide: GrantSystemAccessUseCasePort,
			useClass: GrantSystemAccessUseCase,
		},
		{
			provide: ProvisionUserUseCasePort,
			useClass: ProvisionUserUseCase,
		},
		{
			provide: ListSystemMembersUseCasePort,
			useClass: ListSystemMembersUseCase,
		},
		{
			provide: RevokeSystemAccessUseCasePort,
			useClass: RevokeSystemAccessUseCase,
		},
		{
			provide: UpdateMemberRoleUseCasePort,
			useClass: UpdateMemberRoleUseCase,
		},
		{
			provide: GrantAccessUnitOfWorkPort,
			useClass: DrizzleGrantAccessUnitOfWorkAdapter,
		},

		// Repository adapters
		{ provide: AccountRepositoryPort, useClass: DrizzleAccountRepository },
		{ provide: DeviceRepositoryPort, useClass: DrizzleDeviceRepositoryAdapter },
		{
			provide: PasswordHistoryRepositoryPort,
			useClass: DrizzlePasswordHistoryRepository,
		},
		{
			provide: SessionAuditLogRepositoryPort,
			useClass: DrizzleSessionAuditLogRepository,
		},
		{ provide: SessionRepositoryPort, useClass: DrizzleSessionRepository },
		{ provide: UserRepositoryPort, useClass: DrizzleUserRepository },
		{ provide: TermsRepositoryPort, useClass: DrizzleTermsRepository },
		{
			provide: UserTermsAcceptanceRepositoryPort,
			useClass: DrizzleUserTermsAcceptanceRepository,
		},
		{ provide: SystemRepositoryPort, useClass: DrizzleSystemRepository },
		{ provide: JwkRepositoryPort, useClass: DrizzleJwkRepository },
		{
			provide: SystemMembershipRepositoryPort,
			useClass: DrizzleSystemMembershipRepository,
		},
		{ provide: JwtMintServicePort, useClass: Es256JwtMintAdapter },
		{ provide: TwoFactorRepositoryPort, useClass: DrizzleTwoFactorRepository },
		{
			provide: ForceRevokeUnitOfWorkPort,
			useClass: DrizzleForceRevokeUnitOfWorkAdapter,
		},
		{
			provide: TwoFactorActivateUnitOfWorkPort,
			useClass: DrizzleTwoFactorActivateUnitOfWorkAdapter,
		},
		{
			provide: TwoFactorPendingMethodPort,
			useClass: RedisTwoFactorPendingMethodAdapter,
		},
		{
			provide: SecurityNotificationPort,
			useClass: SecurityNotificationAdapter,
		},

		// Audit log adapters
		{ provide: AuditLogServicePort, useClass: DrizzleAuditLogAdapter },
		{ provide: SystemAuditLogPort, useClass: DrizzleSystemAuditLogAdapter },
		{
			provide: ChangeEmailAuditLogPort,
			useClass: DrizzleChangeEmailAuditLogAdapter,
		},
		{
			provide: ChangeEmailPendingPort,
			useClass: RedisChangeEmailPendingAdapter,
		},
		{
			provide: ChangePasswordAuditLogPort,
			useClass: DrizzleChangePasswordAuditLogAdapter,
		},
		{
			provide: PasswordResetAuditLogPort,
			useClass: DrizzlePasswordResetAuditLogAdapter,
		},
		{
			provide: TwoFactorAuditLogRepositoryPort,
			useClass: DrizzleTwoFactorAuditLogAdapter,
		},

		// Better Auth adapters
		{ provide: BetterAuthOrgPort, useClass: BetterAuthOrgAdapter },

		// Pending terms store (Redis-backed)
		{ provide: PendingTermsStorePort, useClass: RedisPendingTermsStoreAdapter },

		// OAuth system context store (Redis-backed — survives OAuth redirect round-trip)
		{
			provide: OAuthSystemContextStorePort,
			useClass: RedisOAuthSystemContextStoreAdapter,
		},

		// Password-reset support (Redis-backed)
		{
			provide: PasswordResetRateLimitPort,
			useClass: RedisPasswordResetRateLimitAdapter,
		},
		{
			provide: VerificationRepositoryPort,
			useClass: RedisVerificationRepositoryAdapter,
		},

		// Shared Zoom API auth — injected into both ZoomEmailAdapter and ZoomSmsAdapter
		ZoomAuthService,

		// Service adapters
		{ provide: EmailServicePort, useClass: ZoomEmailAdapter },
		{ provide: SmsServicePort, useClass: ZoomSmsAdapter },
		{ provide: PasswordHashServicePort, useClass: Argon2HashAdapter },
		{ provide: TokenServicePort, useClass: HmacTokenAdapter },
		{ provide: SystemKeyPort, useClass: DrizzleSystemKeyAdapter },
		{ provide: CaptchaServicePort, useClass: CloudflareCaptchaAdapter },

		// Middleware registered as providers for NestJS DI
		SystemKeyMiddleware,

		// Better Auth hook classes — wired via @Hook() / @BeforeHook() / @AfterHook()
		// DeviceHook must be registered before SignInHook and SocialCallbackHook so that
		// ctx.context.deviceId is set before their @AfterHook handlers run.
		DeviceHook,
		SignUpHook,
		SignInHook,
		SignOutHook,
		SocialSignInHook,
		SocialCallbackHook,
		EmailVerificationHook,
		ForgetPasswordHook,
		ResetPasswordHook,
		ChangeEmailHook,
		ChangePasswordHook,
		TokenHook,
		// PhoneNumberSendOtpHook injects sendPhoneOTP into ctx before the plugin callback runs
		PhoneNumberSendOtpHook,
		// TwoFactorOtpRateLimitHook runs first (per-user rate limit check before DB work)
		TwoFactorOtpRateLimitHook,
		// TwoFactorSendOtpHook runs second — parses body.method and injects sendEmailOTP/sendPhoneOTP
		TwoFactorSendOtpHook,
		TwoFactorVerifyOtpHook,
		TwoFactorEnrollmentHook,
		TwoFactorSkipHook,
		TwoFactorVerifyTotpHook,
		TwoFactorDisableHook,
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer): void {
		// correlationIdMiddleware is applied via expressApp.use() in main.ts, not here.
		// It must run before Better Auth creates its own internal request objects,
		// which happens outside the NestJS middleware chain.
		consumer.apply(sentryScopeMiddleware).forRoutes('*');

		// System key auth middleware — excluded from platform-admin routes (session-auth)
		// and JWKS endpoint (public — no API key needed to fetch public keys).
		consumer
			.apply(SystemKeyMiddleware)
			.exclude(
				SYSTEM_MGMT_ROUTE,
				ADMIN_ROUTE,
				MEMBERS_ROUTE,
				MEMBERS_USER_ROUTE,
				JWKS_ROUTE,
				INTERNAL_ROUTE,
			)
			.forRoutes('*');
	}
}
