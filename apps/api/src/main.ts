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
import { AppModule } from './app.module';

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

function assertEnv(key: string): void {
	if (!process.env[key]) {
		throw new Error(`Missing required environment variable: ${key}`);
	}
}

async function bootstrap(): Promise<void> {
	assertEnv('AUTH_JWKS_URL');
	assertEnv('AUTH_ISSUER');
	assertEnv('AUTH_AUDIENCE');

	const app = await NestFactory.create(AppModule, { bufferLogs: true });
	app.useLogger(app.get(Logger));

	app.setGlobalPrefix('api/v1');

	app.useGlobalPipes(new ZodValidationPipe());

	app.use(helmet({ contentSecurityPolicy: false }));

	app.enableCors({
		origin: [process.env.CORS],
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
