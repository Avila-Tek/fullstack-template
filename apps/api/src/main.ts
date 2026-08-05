// import 'tsconfig-paths/register';
import { config as loadEnv } from 'dotenv';
import { resolve } from 'node:path';
import 'reflect-metadata';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ZodValidationPipe } from './shared/pipes/zodValidationPipe';
// import { DomainErrorFilter } from './modules/shared/platform/web/DomainErrorFilter';

// nest start corre desde apps/api (cwd) o desde dist/; cubrimos ambos
loadEnv({ path: resolve(process.cwd(), '.env') });
loadEnv({ path: resolve(__dirname, '../.env') });

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // El client/admin usan baseURL .../api + paths /v1/...
  // → rutas reales: /api/v1/auth/sign-in, /api/v1/users/...
  app.setGlobalPrefix('api/v1');

  app.useGlobalPipes(new ZodValidationPipe());

  // app.useGlobalFilters(new DomainErrorFilter());
  app.use(
    helmet({
      contentSecurityPolicy: false,
    })
  );

  app.enableCors({
    origin: [process.env.CORS],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    credentials: true,
  });

  // app.useGlobalFilters(new DomainErrorFilter());

  const swaggerConfig = new DocumentBuilder()
    .setTitle('API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('api/docs', app, document, {
    useGlobalPrefix: false,
  });

  const port = Number(process.env.PORT) || 8080;
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
  console.log(`Swagger: http://localhost:${port}/api/docs`);
  console.log(`Sign-in: POST http://localhost:${port}/api/v1/auth/sign-in`);
}
bootstrap();
