# F1: External Infrastructure Setup

Everything you need running **before** the API can boot and pass its health checks.

---

## TL;DR — Minimum to start developing

```bash
# 1. Start Postgres + Redis
docker compose up -d postgres redis

# 2. Copy and fill the env file
cp apps/api/.env.example apps/api/.env
# Edit apps/api/.env — at minimum set SERVICE_NAME

# 3. Boot the API
npm run dev -w apps/api
```

OTel and Sentry are **optional** — the API starts without them.

---

## Required services

### PostgreSQL

DrizzleModule connects at startup. If Postgres is unreachable the process exits.
`GET /health/ready` also runs `SELECT 1` — returns 503 if down.

```bash
docker run -d \
  --name api-postgres \
  -e POSTGRES_USER=api \
  -e POSTGRES_PASSWORD=secret \
  -e POSTGRES_DB=api_dev \
  -p 5432:5432 \
  postgres:16-alpine
```

```bash
# apps/api/.env
DATABASE_URL=postgres://api:secret@localhost:5432/api_dev
```

In production use a connection string with SSL:
`DATABASE_URL=postgres://user:pass@host:5432/db?sslmode=require`

---

### Redis

RedisModule calls `PING` on startup. If Redis is unreachable the process exits.

```bash
docker run -d \
  --name api-redis \
  -p 6379:6379 \
  redis:7-alpine
```

```bash
# apps/api/.env
REDIS_URL=redis://localhost:6379
```

In production Redis with TLS uses the `rediss://` scheme — ioredis detects it automatically:
`REDIS_URL=rediss://user:pass@host:6380`

---

## Required environment variables

`env.ts` uses Zod to validate every variable at startup. The process exits immediately with a descriptive error if a required variable is missing.

```bash
# ─── App ───────────────────────────────────────────────────────────────────
NODE_ENV=development
PORT=3000
CLIENT_URL=http://localhost:3001

# ─── Database ──────────────────────────────────────────────────────────────
DATABASE_URL=postgres://api:secret@localhost:5432/api_dev

# ─── Redis ─────────────────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ─── Rate limiting ─────────────────────────────────────────────────────────
RATE_LIMIT_GLOBAL_WINDOW_MS=60000
RATE_LIMIT_GLOBAL_MAX=100

# ─── Observability ─────────────────────────────────────────────────────────
# SERVICE_NAME is REQUIRED — the process exits without it.
# Format: {project}-{domain}, lowercase, hyphen-separated. See naming-conventions.md.
SERVICE_NAME=fullstack-api
SERVICE_VERSION=0.0.0
SERVICE_NAMESPACE=platform
LOG_LEVEL=debug
```

### What happens without each optional variable

| Variable | Default | Behaviour when absent |
|---|---|---|
| `SERVICE_NAME` | none | **Process exits** — required by Zod schema |
| `DATABASE_URL` | none | **Process exits** — required by Zod schema |
| `REDIS_URL` | none | **Process exits** — required by Zod schema |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | none | OTel SDK starts in no-op mode — all spans silently dropped |
| `SENTRY_DSN` | none | `instrument.ts` skips `Sentry.init()` — no crash, no noise |
| `GIT_SHA` | none | Sentry `release` field left blank |
| `LOG_LEVEL` | `info` | Falls back to `info` |
| `SERVICE_VERSION` | `0.0.0` | Used in OTel resource attrs |
| `SERVICE_NAMESPACE` | `default` | Used in OTel resource attrs |

---

## Optional services

### OpenTelemetry Collector

The API sends traces, metrics, and logs to the Collector via HTTP (`OTLP/HTTP`, port `4318`). Without this endpoint all telemetry is silently dropped — the API boots and works normally.

You only need the Collector when you want to **verify** that observability is wired correctly.

**Minimal local config** — `otel-collector-config.yaml` (place at repo root):

```yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

exporters:
  debug:
    verbosity: detailed   # prints received spans/metrics/logs to Collector stdout

service:
  pipelines:
    traces:
      receivers: [otlp]
      exporters: [debug]
    metrics:
      receivers: [otlp]
      exporters: [debug]
    logs:
      receivers: [otlp]
      exporters: [debug]
```

```bash
docker run -d \
  --name otel-collector \
  -p 4318:4318 \
  -v $(pwd)/otel-collector-config.yaml:/etc/otelcol/config.yaml \
  otel/opentelemetry-collector:latest
```

```bash
# apps/api/.env
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
```

**To verify it's working:**
1. Make any request to the API (e.g. `GET /health`)
2. Check the Collector container logs — you should see spans, metrics, and log records printed

In production the Collector is configured by the infra team to forward to Grafana Cloud (Loki + Tempo + Prometheus) — no changes needed in the API itself.

---

### Sentry

Create a **NestJS / Node.js** project in Sentry and paste the DSN:

```bash
# apps/api/.env
SENTRY_DSN=https://xxxx@yyyy.ingest.sentry.io/zzzz
GIT_SHA=local   # replaced by the git SHA at deploy time in CI
```

The `instrument.ts` file wraps `Sentry.init()` in a guard — if `SENTRY_DSN` is absent the call is skipped and everything continues normally.

**Note:** Sentry is configured with `beforeSend` to drop all 4xx errors. Only 5xx responses and unhandled exceptions are sent. 4xx client errors go to Loki (via the OTel log pipeline) per the Avila Tek observability standard.

---

## docker-compose.yml (recommended)

Add this file to `apps/api/` (or the repo root) so anyone can start all dependencies with one command.

```yaml
# apps/api/docker-compose.yml
services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: api
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: api_dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U api -d api_dev"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 3s
      retries: 5

  otel-collector:
    image: otel/opentelemetry-collector:latest
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol/config.yaml
    ports:
      - "4318:4318"   # OTLP/HTTP — API sends here
    profiles:
      - observability  # only starts when: docker compose --profile observability up

volumes:
  postgres_data:
```

```bash
# Start only required services (Postgres + Redis)
docker compose up -d

# Start everything including OTel Collector
docker compose --profile observability up -d
```

---

## Dependency summary

| Service | Required to boot | Required for `/health/ready` | How to skip |
|---|---|---|---|
| **PostgreSQL** | ✅ Yes | ✅ Yes | Cannot — DrizzleModule exits on failure |
| **Redis** | ✅ Yes | ✅ Yes (added in F2) | Cannot — RedisModule pings on init |
| **`SERVICE_NAME` env var** | ✅ Yes | — | Cannot — Zod schema exits without it |
| **OTel Collector** | ❌ No | ❌ No | Omit `OTEL_EXPORTER_OTLP_ENDPOINT` |
| **Sentry** | ❌ No | ❌ No | Omit `SENTRY_DSN` |
| **Grafana / Loki / Tempo** | ❌ No | ❌ No | Configured in Collector, not the API |

---

## Production environment variables

Variables that differ from the local defaults in a production deploy:

```bash
NODE_ENV=production
SERVICE_NAME=fullstack-api           # same format, injected by deploy pipeline
SERVICE_VERSION=1.2.3                # injected from package.json at build time
GIT_SHA=abc1234                      # injected from $GITHUB_SHA in CI

DATABASE_URL=postgres://...?sslmode=require
REDIS_URL=rediss://...               # note: rediss:// for TLS

OTEL_EXPORTER_OTLP_ENDPOINT=https://otel-collector.internal:4318
SENTRY_DSN=https://...@....ingest.sentry.io/...

LOG_LEVEL=info                       # not debug in production
```

`SERVICE_VERSION` and `GIT_SHA` are the two values that should be injected at build/deploy time — they are what allow correlating a Sentry error or a Grafana spike to a specific release.
