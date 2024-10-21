// Import this first!
import './instrument';
import { prismaPlugin } from '@/plugins/prisma';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import * as Sentry from '@sentry/node';
import Fastify, { FastifyHttpOptions } from 'fastify';
import { Server } from 'http';

export async function createApp() {
  let config: FastifyHttpOptions<Server> = {};

  if (process.env.NODE_ENV === 'production') {
    config = {
      logger: {
        level: 'info',
        transport: {
          target: '@axiomhq/pino',
          options: {
            dataset: process.env.AXIOM_DATASET,
            token: process.env.AXIOM_TOKEN,
          },
        },
      },
    };
  }

  const app = Fastify(config);

  await app.register(prismaPlugin);

  if (process.env.NODE_ENV === 'production') {
    Sentry.setupFastifyErrorHandler(app);
    await app.register(helmet);
    await app.register(rateLimit);
  }

  await app.register(cors, {
    origin: JSON.parse(process.env.CORS_ORIGINS ?? '["*"]'),
    credentials: true,
  });

  await app.ready();

  return app;
}
