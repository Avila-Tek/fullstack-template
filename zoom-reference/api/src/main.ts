import { loadEnv } from './env';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { buildSwaggerDocument, ZodValidationPipe } from '@zoom/swagger';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';

async function bootstrap(): Promise<void> {
	// loadEnv() resolves any GCP Secret Manager locators in process.env and
	// mirrors the resolved values back onto `env`. Must run BEFORE any dynamic
	// import that reads env at module scope:
	//   - ./instrument — Sentry.init() reads process.env at side-effect time
	//   - ./app.module — transitively imports modules (telemetry, metrics) that
	//     capture env.X into module-scope constants at import time
	await loadEnv();
	await import('./instrument.js');
	const { AppModule } = await import('./app.module.js');
	const { env } = await import('./env.js');

	const app = await NestFactory.create(AppModule, { bufferLogs: true });
	app.useLogger(app.get(Logger));

	app.setGlobalPrefix('api/v1');

	app.useGlobalPipes(new ZodValidationPipe());

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

	app.enableCors({
		origin: [env.CORS],
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		credentials: true,
	});

	buildSwaggerDocument(app, {
		title: 'Main API',
		description: 'Primary REST API',
		version: '1.0',
		authType: 'both',
		apiKeyName: 'x-service-secret',
		servers: [env.ORCHESTRATOR_URL, `http://localhost:${env.PORT}`],
	});

	await app.listen(env.PORT);
}

bootstrap().catch((err) => {
	console.error('❌ Main API bootstrap failed:', err);
	process.exit(1);
});
