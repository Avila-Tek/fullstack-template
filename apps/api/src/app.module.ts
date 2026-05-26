import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { LoggerModule } from 'nestjs-pino';

import { DrizzleModule } from './infrastructure/database/drizzle.module.js';
import { RedisModule } from './infrastructure/redis/redis.module.js';
import { HealthModule } from './infrastructure/health/health.module.js';
import { AllExceptionsFilter } from './infrastructure/filters/all-exceptions.filter.js';
import { HttpExceptionFilter } from './infrastructure/filters/http-exception.filter.js';
import { DomainExceptionFilter } from './infrastructure/filters/domain-exception.filter.js';
import { ApiResponseInterceptor } from './infrastructure/interceptors/api-response.interceptor.js';
import { CorrelationIdMiddleware } from './infrastructure/middleware/correlation-id.middleware.js';
import { SessionActivityMiddleware } from './auth/infrastructure/middleware/session-activity.middleware.js';
import { pinoConfig } from './infrastructure/telemetry/pino.config.js';
import { SecurityModule } from './security.module.js';
import { AuthModule } from './auth/module.js';

@Module({
  imports: [
    // ── Logging ─────────────────────────────────────────────────────────────
    LoggerModule.forRoot(pinoConfig),

    // ── Domain events ────────────────────────────────────────────────────────
    // wildcard: true is REQUIRED for @OnEvent('auth.*') pattern matching
    EventEmitterModule.forRoot({ wildcard: true, delimiter: '.', global: true }),

    // ── Infrastructure ───────────────────────────────────────────────────────
    DrizzleModule,
    RedisModule,
    HealthModule,

    // ── Security ─────────────────────────────────────────────────────────────
    SecurityModule,

    // ── Auth ─────────────────────────────────────────────────────────────────
    AuthModule,
  ],

  providers: [
    // ── Exception filters (registration order = least → most specific) ───────
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },

    // ── Response interceptor ─────────────────────────────────────────────────
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    // 1. CorrelationId — runs first on every route
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');

    // 2. SessionActivity — excluded from auth routes, public routes, and health
    consumer
      .apply(SessionActivityMiddleware)
      .exclude(
        { path: 'api/v1/auth/(.*)', method: RequestMethod.ALL },
        { path: 'api/v1/public/(.*)', method: RequestMethod.ALL },
        { path: 'health', method: RequestMethod.ALL },
        { path: 'health/ready', method: RequestMethod.ALL },
      )
      .forRoutes('*');
  }
}
