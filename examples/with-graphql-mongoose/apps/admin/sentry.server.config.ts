// This file configures the initialization of Sentry on the server.
// The config you add here will be used whenever the server handles a request.
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: "insertYourDNS",
  environment: process.env.NODE_ENV, // "development", "staging", "production"

  // Define how likely traces are sampled. Adjust this value in production, or use tracesSampler for greater control.
  tracesSampleRate: 0.3,

  // Enable logs to be sent to Sentry
  enableLogs: true,

});
