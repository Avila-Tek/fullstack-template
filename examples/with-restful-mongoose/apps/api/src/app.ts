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
        transport: {
          target: 'pino-loki',
          options: {
            batching: true,
            interval: 5,
            labels: {
              app: envs.loki.appName,
            },
            host: envs.loki.host,
            basicAuth: {
              username: envs.loki.username,
              password: envs.loki.password,
            },
          },
        },
      },
    };
  }

  const app = Fastify(config);

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
  await app.register(autoload, {
    dir: path.join(__dirname, 'plugins/integrations'),
  });

  // Register Routes and Websockets
  await app.register(autoload, {
    dir: path.join(__dirname, 'plugins/routes'),
  });

  await app.ready();
  app.swagger();

  return app;
}
