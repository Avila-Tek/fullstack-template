import type { MiddlewareConsumer, NestModule } from '@nestjs/common';
import { Module } from '@nestjs/common';
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
import { pinoConfig } from './infrastructure/telemetry/pino.config.js';
import { SecurityModule } from './security.module.js';

@Module({
  imports: [
    // ── Logging ─────────────────────────────────────────────────────────────
    LoggerModule.forRoot(pinoConfig),

    // ── Domain events ────────────────────────────────────────────────────────
    EventEmitterModule.forRoot({ wildcard: false, delimiter: '.', global: true }),

    // ── Infrastructure ───────────────────────────────────────────────────────
    DrizzleModule,
    RedisModule,
    HealthModule,

    // ── Security ─────────────────────────────────────────────────────────────
    SecurityModule,
  ],

  providers: [
    // ── Exception filters (registration order = least → most specific) ───────
    // NestJS resolves by @Catch specificity; DomainException < HttpException < catch-all
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_FILTER, useClass: HttpExceptionFilter },
    { provide: APP_FILTER, useClass: DomainExceptionFilter },

    // ── Response interceptor ─────────────────────────────────────────────────
    { provide: APP_INTERCEPTOR, useClass: ApiResponseInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(CorrelationIdMiddleware).forRoutes('*');
  }
}
