// Sentry must be imported BEFORE any other modules.
// Keep this file as lean as possible — just init + integrations.
import * as Sentry from '@sentry/nestjs';
import { env } from './env.js';

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
  release: env.GIT_SHA,

  // Drop client errors (4xx) — only capture server faults
  beforeSend(event) {
    const status = event.contexts?.response?.status_code as number | undefined;
    if (status !== undefined && status >= 400 && status < 500) {
      return null;
    }
    return event;
  },
});
