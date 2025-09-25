import * as Sentry from '@sentry/node';
import { nodeProfilingIntegration } from '@sentry/profiling-node';
import { envs } from './config';

// Ensure to call this before importing any other modules!
Sentry.init({
  dsn: envs.sentry.dsn,
  integrations: [
    // Add our Profiling integration
    nodeProfilingIntegration(),
    Sentry.rewriteFramesIntegration({ root: process.cwd() || __dirname }),
    Sentry.fastifyIntegration(),
    Sentry.httpIntegration(),
  ],

  // Add Tracing by setting tracesSampleRate
  // We recommend adjusting this value in production
  tracesSampleRate: 0.2,

  // Set sampling rate for profiling
  // This is relative to tracesSampleRate
  profilesSampleRate: 0.2,
  sendDefaultPii: true,
  enableLogs: false,
  enabled: envs.stage === 'production',
});
