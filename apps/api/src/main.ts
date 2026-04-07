import './instrument';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { NestFactory } from '@nestjs/core';
import dotenv from 'dotenv';
import helmet from 'helmet';
import { Logger } from 'nestjs-pino';
import {
	buildSwaggerDocument,
	ZodValidationPipe,
} from '@/shared/swagger/swagger';
import 'reflect-metadata';

// Load .env before env validation runs
const envCandidates = [
	resolve(process.cwd(), '.env'),
	resolve(process.cwd(), 'apps/api/.env'),
	resolve(__dirname, '../.env'),
];

for (const envPath of envCandidates) {
	if (existsSync(envPath)) {
		dotenv.config({ path: envPath });
		break;
	}
}

// Side-effect import — validates required env vars and throws if any are missing.
import './env';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
	// bodyParser: false — Better Auth routes require raw body access.
	// JSON parsing is applied selectively via middleware in IdentityModule.
	const app = await NestFactory.create(AppModule, {
		bufferLogs: true,
		bodyParser: false,
	});
	app.useLogger(app.get(Logger));

	app.setGlobalPrefix('api/v1');

	app.useGlobalPipes(new ZodValidationPipe());

	app.use(helmet({ contentSecurityPolicy: false }));

	const trustedOrigins = [
		process.env.CLIENT_URL ?? 'http://localhost:4200',
		process.env.ADMIN_URL ?? 'http://localhost:3000',
	].filter(Boolean);

	app.enableCors({
		origin: trustedOrigins,
		methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
		credentials: true,
	});

	buildSwaggerDocument(app, {
		title: 'Main API',
		description: 'Primary REST API',
		version: '1.0',
		authType: 'bearer',
	});

	await app.listen(process.env.PORT ?? 3002);
}

bootstrap();
