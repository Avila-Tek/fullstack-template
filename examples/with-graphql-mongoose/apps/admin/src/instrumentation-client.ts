// This file configures the initialization of Sentry on the client.
// The added config here will be used whenever a users loads a page in their browser.
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


export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;