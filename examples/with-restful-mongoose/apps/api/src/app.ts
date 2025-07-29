// Import this first!
import './instrument';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import {
  featureFlagProviders,
  TFeatureFlagProvider,
} from '@repo/feature-flags/shared';
import * as Sentry from '@sentry/node';
import Fastify, { FastifyHttpOptions } from 'fastify';
import { Server } from 'http';
import mongoose from 'mongoose';
import featureFlagsPlugin from './plugins/feature-flags';

const provider = process.env.FEATURE_FLAG_PROVIDER as TFeatureFlagProvider;

export async function createApp() {
  let connection: typeof mongoose | null = null;
  try {
    connection = await mongoose
      .connect(String(process.env.DATABASE))
      .then((conn) => {
        return conn;
      });

    mongoose.connection.on('error', (err) => `❌🤬❌🤬 ${err}`);
  } catch (err) {
    console.log(`ERROR: ${err}`);
    if (connection && connection.connection) {
      connection.connection.close();
    }
    process.exit(1);
  }

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

  if (process.env.NODE_ENV === 'production') {
    Sentry.setupFastifyErrorHandler(app);
    await app.register(helmet);
    await app.register(rateLimit);
  }

  await app.register(cors, {
    origin: JSON.parse(process.env.CORS_ORIGINS ?? '["*"]'),
    credentials: true,
  });

  await app.register(featureFlagsPlugin, {
    provider,
    postHog:
      provider === featureFlagProviders.post_hog
        ? {
            apiKey: process.env.POSTHOG_API_KEY!,
            host: process.env.POSTHOG_HOST,
          }
        : undefined,
    growthBook:
      provider === featureFlagProviders.growth_book
        ? {
            apiKey: process.env.GROWTHBOOK_API_KEY!,
            apiHost: process.env.GROWTHBOOK_API_HOST,
          }
        : undefined,
  });

  await app.ready();

  return app;
}
