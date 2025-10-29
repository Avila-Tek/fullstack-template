import * as Sentry from '@sentry/node';
import { FastifyInstance } from 'fastify';
import { envs } from '@/config';

function sentryPlugin(fastify: FastifyInstance) {
  if (envs.stage === 'production') {
    Sentry.setupFastifyErrorHandler(fastify);
  }
}

export default sentryPlugin;
