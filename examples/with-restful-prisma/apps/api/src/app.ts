// Import this first!
import './instrument';
import { prismaPlugin } from '@/plugins/prisma';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import * as Sentry from '@sentry/node';
import Fastify from 'fastify';

export async function createApp() {
  const app = Fastify({
    logger: {
      level: 'info',
    },
  });

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
