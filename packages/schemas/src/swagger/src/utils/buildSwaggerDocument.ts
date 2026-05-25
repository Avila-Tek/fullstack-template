import type { INestApplication, Type } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

export interface SwaggerConfig {
  title: string;
  description: string;
  version: string;
  /** Auth scheme(s) to register in the OpenAPI security definitions. */
  authType: 'bearer' | 'apiKey' | 'both' | 'none';
  /** Header name for apiKey auth (e.g. 'X-Service-Secret'). Required when authType is 'apiKey' or 'both'. */
  apiKeyName?: string;
  /** Additional server URLs to list in the OpenAPI document. */
  servers?: string[];
}

/**
 * Creates and mounts a SwaggerModule document only when NODE_ENV !== 'production'.
 * Returns void in production so call sites remain uniform.
 *
 * @param app           The bootstrapped NestJS application.
 * @param config        Swagger document configuration.
 * @param path          URL path for the Swagger UI (default: 'api/docs').
 * @param extraControllers  Additional controller classes to include in the document
 *                          without adding them to the NestJS module graph (e.g. virtual controllers).
 */
export function buildSwaggerDocument(
  app: INestApplication,
  config: SwaggerConfig,
  path = 'api/docs',
  extraControllers: Type[] = []
): void {
  if (process.env.NODE_ENV === 'production') return;

  const builder = new DocumentBuilder()
    .setTitle(config.title)
    .setDescription(config.description)
    .setVersion(config.version);

  if (config.authType === 'bearer' || config.authType === 'both') {
    builder.addBearerAuth().addSecurityRequirements('bearer');
  }

  if (config.authType === 'apiKey' || config.authType === 'both') {
    const name = config.apiKeyName ?? 'X-Service-Secret';
    builder.addApiKey({ type: 'apiKey', in: 'header', name: name }, name);
  }

  if (config.servers) {
    for (const serverUrl of config.servers) {
      builder.addServer(serverUrl);
    }
  }

  const document = SwaggerModule.createDocument(app, builder.build(), {
    include: extraControllers.length > 0 ? extraControllers : undefined,
  });

  SwaggerModule.setup(path, app, document);
}
