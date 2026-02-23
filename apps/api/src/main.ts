// import 'tsconfig-paths/register';
import 'reflect-metadata';
import helmet from 'helmet';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { ZodValidationPipe } from './shared/pipes/zodValidationPipe';
// import { DomainErrorFilter } from './modules/shared/platform/web/DomainErrorFilter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  const config = new DocumentBuilder()
    .setTitle('API')
    .setDescription('API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 8080);
}
bootstrap();
