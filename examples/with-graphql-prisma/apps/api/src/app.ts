// Import this first!
import './instrument';
import { Server } from 'http';
import { schema } from '@/graphql/schema';
import { prismaPlugin } from '@/plugins/prisma';
import { ApolloServer } from '@apollo/server';
import { ApolloServerPluginLandingPageDisabled } from '@apollo/server/plugin/disabled';
import { ApolloServerPluginLandingPageLocalDefault } from '@apollo/server/plugin/landingPage/default';
import {
  fastifyApolloDrainPlugin,
  fastifyApolloHandler,
} from '@as-integrations/fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import * as Sentry from '@sentry/node';
import Fastify, { FastifyHttpOptions } from 'fastify';

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

  const apollo = new ApolloServer<any>({
    schema,
    plugins: [
      process.env.NODE_ENV === 'production'
        ? ApolloServerPluginLandingPageDisabled()
        : ApolloServerPluginLandingPageLocalDefault({ footer: false }),
      fastifyApolloDrainPlugin(app),
    ],
  });

  await apollo.start();

  if (process.env.NODE_ENV === 'production') {
    Sentry.setupFastifyErrorHandler(app);
    await app.register(helmet);
    await app.register(rateLimit);
  }

  await app.register(cors, {
    origin: JSON.parse(process.env.CORS_ORIGINS ?? '["*"]'),
    credentials: true,
  });

  app.route({
    url: '/graphql',
    method: ['GET', 'POST', 'OPTIONS'],
    handler: fastifyApolloHandler(apollo, {
      context: async (request, reply) => ({ req: request, res: reply }),
    }),
  });

  await app.ready();

  return app;
}
