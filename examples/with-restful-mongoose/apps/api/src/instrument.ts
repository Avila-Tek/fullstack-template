// Sentry is disabled in Docker containers to avoid module resolution issues
// If you need Sentry in production, ensure all dependencies are properly copied
// and the SENTRY_DSN environment variable is set

console.log('Sentry instrumentation disabled for Docker container');
