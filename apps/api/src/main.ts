// OTel MUST be first — SDK must start before any instrumented module loads
import './infrastructure/telemetry/otel.js';
// Sentry MUST be the second import so it instruments before NestJS loads
import './instrument.js';
import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { Logger } from 'nestjs-pino';
import helmet from 'helmet';

import { AppModule } from './app.module.js';
import { env } from './env.js';
import { setupSwagger } from './infrastructure/swagger/swagger.setup.js';
import { ZodValidationPipe } from './shared/pipes/zodValidationPipe.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    // Suppress default NestJS logger — nestjs-pino takes over
    bufferLogs: true,
  });

  // ── Structured logging ──────────────────────────────────────────────────────
  app.useLogger(app.get(Logger));
  app.flushLogs();

  // ── Security headers ────────────────────────────────────────────────────────
  app.use(helmet());

  // ── CORS ────────────────────────────────────────────────────────────────────
  app.enableCors({
    origin: env.CLIENT_URL,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // ── Global prefix ───────────────────────────────────────────────────────────
  app.setGlobalPrefix('api/v1', { exclude: ['health'] });

  // ── Global validation pipe ──────────────────────────────────────────────────
  app.useGlobalPipes(new ZodValidationPipe());

  // ── Swagger (dev only) ──────────────────────────────────────────────────────
  setupSwagger(app);

  await app.listen(env.PORT, '0.0.0.0');

  const logger = app.get(Logger);
  const url = `http://localhost:${env.PORT}`;
  logger.log(`🚀 API running on ${url}`, 'Bootstrap');
  logger.log(`📄 Swagger available at ${url}/api/v1/docs`, 'Bootstrap');
  logger.log(`🌍 Environment: ${env.NODE_ENV}`, 'Bootstrap');
}

bootstrap();
