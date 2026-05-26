import { env, loadEnv } from './env';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ExpressAdapter } from '@nestjs/platform-express';
import { buildSwaggerDocument } from '@zoom/swagger';
import express from 'express';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

async function bootstrap(): Promise<void> {
	// loadEnv() resolves any GCP Secret Manager locators in process.env and
	// mirrors the resolved values back onto `env`. Must run BEFORE any dynamic
	// import that reads env at module scope:
	//   - ./instrument — Sentry.init() reads process.env at side-effect time
	//   - ./app.module — transitively imports auth.ts, which creates Pool,
	//     Redis, and betterAuth() with secret at module load time
	//   - ./env (named import here) — accessed after loadEnv completes
	await loadEnv();

	if (env.NODE_ENV === 'production' && env.SKIP_CAPTCHA) {
		throw new Error(
			'SKIP_CAPTCHA must not be enabled in production. Unset the variable and redeploy.',
		);
	}

	await import('./instrument.js');
	const { AppModule } = await import('./app.module.js');
	const { correlationIdMiddleware } = await import(
		'./infrastructure/telemetry/correlation-id.middleware.js'
	);

	// correlationIdMiddleware must run before Better Auth creates its internal
	// Request object from the raw Node.js IncomingMessage. Registering it on the
	// raw Express instance guarantees it executes before AuthModule mounts the
	// BetterAuth middleware — NestJS configure() middlewares run after AuthModule.
	const expressApp = express();
	expressApp.use(correlationIdMiddleware);

	// bodyParser must be disabled globally — Better Auth needs raw request body
	const app = await NestFactory.create(
		AppModule,
		new ExpressAdapter(expressApp),
		{
			bodyParser: false,
			bufferLogs: true,
		},
	);
	app.useLogger(app.get(Logger));

	// Better Auth routes (/api/v1/auth/*) use basePath configured in auth.ts — not affected by this prefix
	app.setGlobalPrefix('api/v1');

	app.use(
		helmet({
			contentSecurityPolicy: {
				directives: {
					defaultSrc: ["'self'"],
					scriptSrc: ["'self'"],
					styleSrc: ["'self'", "'unsafe-inline'"],
					imgSrc: ["'self'", 'data:'],
					objectSrc: ["'none'"],
					frameAncestors: ["'none'"],
					baseUri: ["'self'"],
				},
			},
		}),
	);

	const trustedOrigins = [env.ORCHESTRATOR_URL];

	app.enableCors({
		origin: trustedOrigins,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		credentials: true,
	});

	// Must be called after all middleware (body parser disabled, Better Auth middleware registered via AppModule).
	buildSwaggerDocument(app, {
		title: 'Auth Service',
		description:
			'Authentication & Identity Provider — Better Auth + custom NestJS controllers',
		version: '1.0',
		authType: 'both',
		apiKeyName: 'x-system-key',
		servers: [env.ORCHESTRATOR_URL, `http://localhost:${env.PORT}`],
	});

	await app.listen(env.PORT);
}

bootstrap().catch((err) => {
	console.error('❌ Auth Service bootstrap failed:', err);
	process.exit(1);
});
