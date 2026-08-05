// Client Sentry bootstrap.
// Evita import estático de @sentry/nextjs en local: infla app/layout.js (~2MB+)
// y provoca ChunkLoadError (timeout) en Windows/dev.
// Para activarlo: define NEXT_PUBLIC_SENTRY_DSN en .env.local

const sentryDsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

export const onRouterTransitionStart = (..._args: unknown[]) => {
  // no-op sin Sentry; con DSN se reemplaza tras el import dinámico
};

if (sentryDsn) {
  void import('@sentry/nextjs').then((Sentry) => {
    Sentry.init({
      dsn: sentryDsn,
      tracesSampleRate: 1,
      enableLogs: true,
      sendDefaultPii: true,
    });
  });
}
