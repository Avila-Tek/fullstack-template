import path from 'node:path';
import autoload from '@fastify/autoload';
import Fastify, { FastifyHttpOptions } from 'fastify';
import {
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';
import { Server } from 'http';
import { envs } from './config';

export async function createApp() {
  let config: FastifyHttpOptions<Server> = {};

  if (envs.stage === 'production') {
    config = {
      logger: {
        level: envs.loki.level || 'info',
      },
    };
  }

  const app = Fastify(config).withTypeProvider<ZodTypeProvider>();

  // Add schema validator and serializer
  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  // Register error handlers first
  await app.register(autoload, {
    dir: path.join(__dirname, 'plugins/errors'),
  });

  // Register plugins
  await app.register(autoload, {
    dir: path.join(__dirname, 'plugins/middlewares'),
  });
  
  // Load integrations plugins
  await app.register(autoload, {
    dir: path.join(__dirname, 'plugins/integrations'),
  });

  app.log.info('All plugins registered successfully');

  // Register Routes and Websockets
  await app.register(autoload, {
    dir: path.join(__dirname, 'plugins/routes'),
  });

  await app.ready();
  app.swagger();

  return app;
}
