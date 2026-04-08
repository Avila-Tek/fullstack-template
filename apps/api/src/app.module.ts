import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { SentryGlobalFilter } from '@sentry/nestjs/setup';
import { LoggerModule, PinoLogger } from 'nestjs-pino';
import { LOGGER_PORT } from '@/shared/domain-utils';
import { DrizzleModule } from './infrastructure/database/drizzle.module';
import { AllExceptionsFilter } from './infrastructure/filters/all-exceptions.filter';
import { DomainExceptionFilter } from './infrastructure/filters/domain-exception.filter';
import { HttpExceptionFilter } from './infrastructure/filters/http-exception.filter';
import { HealthModule } from './infrastructure/health/health.module';
import { ApiResponseInterceptor } from './infrastructure/interceptors/api-response.interceptor';
import { DomainToHttpMapper } from './infrastructure/mapping/domain-to-http.mapper';
import { sentryScopeMiddleware } from './infrastructure/telemetry/sentry-scope.middleware';
import { IdentityModule } from './modules/identity/identity.module';
import { SecurityModule } from './security.module';
import { pinoHttpConfig } from './shared/logger/pino.config';

@Module({
	imports: [
		LoggerModule.forRoot(pinoHttpConfig('zoom-api')),
		DrizzleModule,
		HealthModule,
		IdentityModule,
		SecurityModule,
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
		// Mapper used by DomainExceptionFilter
		DomainToHttpMapper,
		{ provide: LOGGER_PORT, useExisting: PinoLogger },
	],
})
export class AppModule implements NestModule {
	configure(consumer: MiddlewareConsumer): void {
		consumer.apply(sentryScopeMiddleware).forRoutes('*');
	}
}
