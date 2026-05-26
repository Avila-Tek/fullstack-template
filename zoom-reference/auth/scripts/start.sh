#!/bin/sh

# Exit on error
set -e

# Load app secrets from mounted dotenv file (Cloud Run secret mount at /secrets/app.env).
if [ -f /secrets/app.env ]; then
    echo "Loading secrets from /secrets/app.env..."
    set -a
    . /secrets/app.env
    set +a
fi

echo "Starting auth bootstrap process..."

# Run database migrations (idempotent; uses pg advisory lock internally)
if [ "$SKIP_MIGRATIONS" = "true" ]; then
    echo "Skipping migrations as SKIP_MIGRATIONS is true."
else
    echo "Running database migrations..."
    node dist/scripts/migrate.js
fi

# Run seeds (idempotent; uses pg advisory lock to coordinate across instances)
if [ "$SKIP_SEEDS" = "true" ]; then
    echo "Skipping database seeding as SKIP_SEEDS is set to true."
else
    echo "Running database seeds..."
    node dist/scripts/seed.js
fi

echo "Starting the application..."
# Start the application with the OpenTelemetry SDK preloaded.
# --require executes the compiled telemetry bootstrap before main.js so the
# NodeSDK is initialized (auto-instrumentations registered, OTLP exporters
# wired) before any HTTP/DB module gets imported. Without this, traces and
# metrics never leave the process even though logs flow via pino-opentelemetry-transport.
node --require ./dist/infrastructure/telemetry/telemetry.js dist/main.js
