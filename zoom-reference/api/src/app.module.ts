import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { LOGGER_PORT } from '@zoom/utils';
import { LoggerModule, PinoLogger } from 'nestjs-pino';
import { DrizzleModule } from './infrastructure/database/drizzle.module';
import { AllExceptionsFilter } from './infrastructure/filters/all-exceptions.filter';
import { DomainExceptionFilter } from './infrastructure/filters/domain-exception.filter';
import { HttpExceptionFilter } from './infrastructure/filters/http-exception.filter';
import { HealthModule } from './infrastructure/health/health.module';
import { ApiResponseInterceptor } from './infrastructure/interceptors/api-response.interceptor';
import { DomainToHttpMapper } from './infrastructure/mapping/domain-to-http.mapper';
import { correlationIdMiddleware } from './infrastructure/telemetry/correlation-id.middleware';
import { sentryScopeMiddleware } from './infrastructure/telemetry/sentry-scope.middleware';
import { CatalogModule } from './modules/catalog/catalog.module';
import { InvitationsModule } from './modules/invitations/invitations.module';
import { MembersModule } from './modules/members/members.module';
import { PricingModule } from './modules/pricing/pricing.module';
import { ProfilesModule } from './modules/profiles/profiles.module';
import { PublicModule } from './modules/public/public.module';
import { RecipientsModule } from './modules/recipients/recipients.module';
import { RegionModule } from './modules/region/region.module';
import { RoleTemplatesModule } from './modules/role-templates/role-templates.module';
import { UsersModule } from './modules/users/users.module';
import { SecurityModule } from './security.module';
import { JwtAuthGuard } from './shared/guards/jwt-auth.guard';
import { PermissionsGuard } from './shared/guards/permissions.guard';
import { pinoHttpConfig } from './shared/logger/pino.config';

@Module({
	imports: [
		LoggerModule.forRoot(pinoHttpConfig('zoom-api')),
		DrizzleModule,
		CatalogModule,
		HealthModule,
		InvitationsModule,
		MembersModule,
		PricingModule,
		PublicModule,
		ProfilesModule,
		RecipientsModule,
		RegionModule,
		RoleTemplatesModule,
		SecurityModule,
		UsersModule,
	],
	providers: [
		// Outermost — forwards all exceptions to Sentry before domain/http filters handle them
		{ provide: APP_FILTER, useClass: SentryGlobalFilter },
		// Catches all unhandled errors and returns a structured 500 response
		{ provide: APP_FILTER, useClass: AllExceptionsFilter },
		// Catches HttpException (guards, pipes, manual throws)
		{ provide: APP_FILTER, useClass: HttpExceptionFilter },
		// Inner filter — catches DomainException before HttpExceptionFilter sees it
		{ provide: APP_FILTER, useClass: DomainExceptionFilter },
		// Wraps all successful responses in the standard ApiResponse envelope
		{ provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
		// Validate JWT on every request; use @Public() to opt out.
		{ provide: APP_GUARD, useClass: JwtAuthGuard },
		// Resolve and validate permissions after JWT; use @RequirePermissions() to enforce.
		{ provide: APP_GUARD, useClass: PermissionsGuard },
		// Mapper used by DomainExceptionFilter
		DomainToHttpMapper,
		{ provide: LOGGER_PORT, useExisting: PinoLogger },
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer): void {
		consumer.apply(correlationIdMiddleware).forRoutes('*');
		consumer.apply(sentryScopeMiddleware).forRoutes('*');
	}
}
