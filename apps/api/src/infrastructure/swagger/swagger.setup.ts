import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { env } from '../../env.js';

export function setupSwagger(app: INestApplication): void {
  if (env.NODE_ENV === 'production') return;

  const config = new DocumentBuilder()
    .setTitle(env.APP_NAME)
    .setDescription(`${env.APP_NAME} REST API`)
    .setVersion(env.SERVICE_VERSION)
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
    .addServer(env.API_BASE_URL, 'Current server')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true },
  });
}
