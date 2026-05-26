# Estándar de Observabilidad — Avila Tek

> **Premisas:** toda telemetría sale del servicio vía OpenTelemetry. El Collector centraliza el enrutamiento. El servicio no conoce los backends — solo conoce el endpoint del Collector.

---

## 1. Arquitectura

```
┌──────────────────────────────────────────────────────────────┐
│                       NestJS API                             │
│                                                              │
│  ┌─────────────────────┐   ┌──────────────────────────────┐  │
│  │   otel.ts (SDK)     │   │  nestjs-pino (pino.config)   │  │
│  │                     │   │                              │  │
│  │  Traces (auto)      │   │  dev:  pino-pretty → stdout  │  │
│  │  Metrics (auto)     │   │  prod: pino-otel-transport   │  │
│  │  HTTP, DB, Redis    │   │        → OTLP/HTTP           │  │
│  └──────────┬──────────┘   └──────────────┬───────────────┘  │
│             │                             │                  │
│             └──────────┬──────────────────┘                  │
│                        │  OTLP/HTTP :4318                    │
└────────────────────────┼────────────────────────────────────┘
                         ▼
┌──────────────────────────────────────────────────────────────┐
│                   OTel Collector                             │
│                                                              │
│  receivers: otlp (gRPC :4317, HTTP :4318)                    │
│  processors: memory_limiter → batch → resource               │
│                                                              │
│  pipelines:                                                  │
│    traces  → otlphttp/tempo  → Tempo  :4318                  │
│    metrics → prometheusremotewrite → Prometheus :9090        │
│    logs    → loki → Loki :3100                               │
└──────────────────────────────────────────────────────────────┘
          │                   │                    │
          ▼                   ▼                    ▼
     ┌─────────┐       ┌──────────────┐     ┌──────────┐
     │  Tempo  │       │  Prometheus  │     │   Loki   │
     │ (traces)│       │  (metrics)   │     │  (logs)  │
     └────┬────┘       └──────┬───────┘     └────┬─────┘
          └────────────────────┴──────────────────┘
                               │
                               ▼
                         ┌──────────┐
                         │ Grafana  │
                         │ :8080    │
                         └──────────┘

Sentry (errores críticos — complementario, no reemplaza Loki)
```

**Separación de responsabilidades:**

| Componente | Responsabilidad |
|---|---|
| OTel SDK (`otel.ts`) | Captura y exporta traces y métricas automáticamente |
| `pino-opentelemetry-transport` | Exporta logs estructurados vía OTLP en producción |
| OTel Collector | Enruta, filtra y transforma telemetría hacia los backends |
| Tempo | Almacena y consulta traces distribuidos |
| Prometheus | Almacena y consulta métricas de tiempo |
| Loki | Almacena y consulta logs estructurados |
| Grafana | UI unificada con correlación log ↔ trace ↔ metric |
| Sentry | Errores 5xx con stack trace completo (los logs solo llevan `errorCode`) |

---

## 2. Log Schema Standard

Todo log debe ser JSON estructurado. Los logs de texto plano no son indexables por Loki.

### Campos requeridos (todos los logs, todos los servicios)

| Campo | Tipo | Ejemplo | Quién lo inyecta |
|---|---|---|---|
| `timestamp` | ISO 8601 UTC | `2024-11-15T10:23:45.123Z` | pino automáticamente |
| `level` | string | `info` | `formatters.level` en pino.config |
| `message` | string | `User signed in` | `messageKey: 'message'` en pino.config |
| `service.name` | string | `fullstack-api` | `formatters.bindings` en pino.config |
| `service.version` | string | `1.4.2` | `formatters.bindings` en pino.config |
| `deployment.environment` | string | `production` | `formatters.bindings` en pino.config |
| `traceId` | string | `4bf92f3577b34da6...` | OTel SDK automáticamente |
| `spanId` | string | `00f067aa0ba902b7` | OTel SDK automáticamente |

> `traceId` y `spanId` solo aparecen dentro de un trace activo. Los logs del proceso al arrancar (bootstrap) no los tendrán.

### Campos contextuales (recomendados en logs de nivel > debug)

| Campo | Tipo | Cuándo incluirlo |
|---|---|---|
| `requestId` | string | En todo log producido durante una HTTP request |
| `userId` | string | Cuando la operación es de un usuario autenticado |
| `errorCode` | string | **Obligatorio** en todo log de nivel `error` o `warn` |
| `err` | Error | En logs `error` — el objeto de error para la serialización de Loki |
| `durationMs` | number | En logs de operaciones con latencia medible |
| `resourceType` | string | Cuando la operación involucra una entidad específica |
| `resourceId` | string | Cuando la operación involucra una instancia específica |

### Niveles de log

| Nivel | Cuándo usar |
|---|---|
| `debug` | Diagnóstico local. **Nunca habilitado en producción.** |
| `info` | Eventos operativos normales: arranque, job completado, usuario autenticado |
| `warn` | Algo inesperado ocurrió pero el sistema se recuperó. Siempre incluir `errorCode` |
| `error` | Operación fallida sin recuperación automática. Siempre incluir `errorCode` + `err` |
| `fatal` | El servicio no puede continuar. Dispara alerta inmediata |

### Reglas absolutas

1. **No PII en logs.** Email, IP, nombre, documento — nunca en texto plano. Usar hashes o `errorCode`.
2. **`errorStack` nunca en producción.** Los stack traces van a Sentry, no a Loki.
3. **`errorCode` en todo `error` y `warn`.** Permite agrupar por tipo de error en Grafana.
4. **No loguear passwords, tokens, ni secrets** bajo ninguna circunstancia.

### Ejemplo de log correcto

```json
{
  "timestamp": "2024-11-15T10:23:45.123Z",
  "level": "error",
  "message": "Email delivery failed",
  "service.name": "fullstack-api",
  "service.version": "1.4.2",
  "deployment.environment": "production",
  "traceId": "4bf92f3577b34da6a3ce929d0e0e4736",
  "spanId": "00f067aa0ba902b7",
  "requestId": "req_8f3a2b1c",
  "userId": "usr_4492",
  "errorCode": "EMAIL_DELIVERY_FAILED"
}
```

### Ejemplo de log incorrecto (violaciones marcadas)

```json
{
  "level": 30,                          ❌ level debe ser string, no número
  "msg": "error sending email",         ❌ campo debe ser "message", no "msg"
  "to": "user@example.com",            ❌ PII — nunca en logs
  "subject": "Password reset",          ❌ PII — nunca en logs
  "errorStack": "Error: timeout\n  at..." ❌ stack trace en producción
}
```

---

## 3. Estructura de archivos

```
apps/api/src/
├── infrastructure/
│   ├── telemetry/
│   │   ├── otel.ts               ← Bootstrap del OTel SDK (cargado antes que todo)
│   │   └── pino.config.ts        ← Configuración de nestjs-pino con schema alignment
│   │
│   ├── filters/
│   │   ├── all-exceptions.filter.ts    ← logs error con { errorCode, err }
│   │   ├── http-exception.filter.ts    ← logs warn/error según status HTTP
│   │   └── domain-exception.filter.ts ← logs warn con { errorCode }
│   │
│   └── middleware/
│       └── correlation-id.middleware.ts ← genera requestId, lo propaga como baggage OTel
│
├── instrument.ts                 ← Sentry.init() (cargado antes que otel.ts en producción)
└── main.ts                       ← import './infrastructure/telemetry/otel.js' en dev
```

```
observability/                    ← stack local de Docker Compose
├── otel-collector-config.yaml
├── prometheus.yml
├── tempo.yaml
└── grafana/
    └── provisioning/
        └── datasources/
            └── datasources.yaml

docker-compose.observability.yml  ← arranca todo el stack
```

---

## 4. Bootstrap del OTel SDK (`otel.ts`)

El SDK debe cargarse **antes que cualquier otro módulo** para que el patching de Node.js HTTP, DNS, Redis, y Postgres funcione correctamente.

```typescript
// apps/api/src/infrastructure/telemetry/otel.ts
import 'dotenv/config';

import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';

const serviceName    = process.env.SERVICE_NAME    ?? 'unknown-service';
const serviceVersion = process.env.SERVICE_VERSION ?? '0.0.0';
const otlpEndpoint   = process.env.OTEL_EXPORTER_OTLP_ENDPOINT;

const resource = resourceFromAttributes({
  [ATTR_SERVICE_NAME]:      serviceName,
  [ATTR_SERVICE_VERSION]:   serviceVersion,
  'service.namespace':      process.env.SERVICE_NAMESPACE ?? 'default',
  'deployment.environment': process.env.NODE_ENV ?? 'development',
});

// Si no hay endpoint configurado, el SDK arranca en no-op mode.
// Los spans y métricas son generados pero silenciosamente descartados.
const traceExporter  = otlpEndpoint ? new OTLPTraceExporter({  url: `${otlpEndpoint}/v1/traces`  }) : undefined;
const metricExporter = otlpEndpoint ? new OTLPMetricExporter({ url: `${otlpEndpoint}/v1/metrics` }) : undefined;

const sdk = new NodeSDK({
  resource,
  ...(traceExporter  ? { traceExporter } : {}),
  ...(metricExporter ? {
    metricReader: new PeriodicExportingMetricReader({
      exporter: metricExporter,
      exportIntervalMillis: 30_000,
    }),
  } : {}),
  instrumentations: [
    getNodeAutoInstrumentations({
      '@opentelemetry/instrumentation-fs': { enabled: false }, // demasiado verboso
    }),
  ],
});

sdk.start();

process.on('SIGTERM', () => {
  sdk.shutdown().finally(() => process.exit(0));
});
```

**En desarrollo**, importar al inicio de `main.ts`:
```typescript
// apps/api/src/main.ts — primera línea
import './infrastructure/telemetry/otel.js';
```

**En producción**, precargar con `--require` para que el patching ocurra antes de cualquier import:
```bash
node --require ./dist/infrastructure/telemetry/otel.js dist/main.js
```

> **Por qué `process.env` y no `env.ts`:** `env.ts` usa Zod y hace imports propios. El SDK se carga antes de que el módulo de NestJS esté inicializado — importar `env.ts` aquí puede crear ciclos de importación. Acceder directamente a `process.env` es la forma correcta en el bootstrap.

---

## 5. Configuración de logs (`pino.config.ts`)

```typescript
// apps/api/src/infrastructure/telemetry/pino.config.ts
import type { IncomingMessage } from 'node:http';
import type { Params } from 'nestjs-pino';
import { env } from '../../env.js';

const isProduction = env.NODE_ENV === 'production';

/**
 * Serializa el objeto `err` para los logs.
 * - Producción: sin stack (va a Sentry, no a Loki)
 * - Desarrollo: con stack para debugging local
 * Maneja throws que no son instancias de Error (strings, objetos planos).
 */
export function buildErrSerializer(
  production: boolean,
): (err: unknown) => Record<string, unknown> {
  if (production) {
    return (err: unknown) => {
      if (err instanceof Error) return { type: err.name, message: err.message };
      return { type: 'UnknownError', message: String(err) };
    };
  }
  return (err: unknown) => {
    if (err instanceof Error) return { type: err.name, message: err.message, stack: err.stack };
    return { type: 'UnknownError', message: String(err) };
  };
}

export const pinoConfig: Params = {
  pinoHttp: {
    level: env.LOG_LEVEL,

    // Schema standard: message field must be named "message", not pino's default "msg"
    messageKey: 'message',

    formatters: {
      // Schema standard: level must be a string ("info"), not pino's numeric code (30)
      level(label: string) {
        return { level: label };
      },
      // Inyecta metadatos estáticos del servicio en TODOS los logs (HTTP y non-HTTP).
      // Retornar un objeto limpio también elimina "pid" y "hostname" del schema.
      bindings(_bindings) {
        return {
          'service.name':           env.SERVICE_NAME,
          'service.version':        env.SERVICE_VERSION,
          'deployment.environment': env.NODE_ENV,
        };
      },
    },

    // Schema standard: HTTP response duration must be "durationMs", not "responseTime"
    customAttributeKeys: { responseTime: 'durationMs' },

    // Schema standard: errorStack must not appear in production logs
    serializers: { err: buildErrSerializer(isProduction) },

    transport: isProduction
      ? {
          // En producción: enviar logs como OTLP al Collector
          target: 'pino-opentelemetry-transport',
          options: {
            resourceAttributes: {
              'service.name':           env.SERVICE_NAME,
              'service.version':        env.SERVICE_VERSION,
              'deployment.environment': env.NODE_ENV,
            },
          },
        }
      : {
          // En desarrollo: pretty-print a stdout
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },

    // Schema standard: field is "requestId", not "correlationId"
    customProps(req: IncomingMessage) {
      const correlationId = (req as IncomingMessage & { correlationId?: string }).correlationId;
      return correlationId ? { requestId: correlationId } : {};
    },

    // Redactar campos sensibles de los logs HTTP automáticos
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password'],
      censor: '[REDACTED]',
    },

    // Suprimir ruido de health checks
    autoLogging: {
      ignore(req) {
        return (req as { url?: string }).url?.startsWith('/health') ?? false;
      },
    },
  },
};
```

> **`pino-opentelemetry-transport` solo en producción:** en desarrollo los logs van a `pino-pretty` (stdout). Para testear el pipeline de logs con Loki localmente, levantar el API con `NODE_ENV=production`.

---

## 6. Cómo instrumentar código nuevo

### 6.1 Propagar `userId` en logs de requests autenticadas

Cuando el usuario se autentica, añadir `userId` al contexto del logger de la request actual. Todos los logs posteriores de esa request incluirán el campo automáticamente.

```typescript
// En cualquier hook o guard que confirme autenticación
import { PinoLogger } from 'nestjs-pino';

// En un after-hook de sign-in:
deps.logger.assign({ userId: user.id });

// En un guard que resuelve el usuario:
this.logger.assign({ userId: req.user.sub });
```

> **Cómo funciona:** `logger.assign()` usa AsyncLocalStorage de `nestjs-pino`. El campo se añade al contexto de la request actual sin afectar otras requests concurrentes.

> **Limitación conocida:** `logger.assign()` solo propaga si la llamada ocurre dentro del scope ALS de NestJS. Los hooks de Better-Auth corren en su propio middleware layer — verificar en staging que el campo aparece en Grafana Loki con un log deliberado post-assign.

### 6.2 Loguear errores correctamente

```typescript
// ✅ Correcto — incluye errorCode y err para Loki
this.logger.error({ errorCode: 'EMAIL_DELIVERY_FAILED', err }, 'Email delivery failed');

// ✅ Correcto — warn con errorCode
this.logger.warn({ errorCode: 'BRUTE_FORCE_THRESHOLD_NEAR', attempts }, 'Login attempts near limit');

// ❌ Incorrecto — sin errorCode, no se puede agrupar en Grafana
this.logger.error('Something went wrong');

// ❌ Incorrecto — PII en el log
this.logger.error({ to: user.email, subject }, 'Email failed');
```

### 6.3 Crear spans personalizados

El auto-instrumentation captura HTTP, PostgreSQL (Drizzle), Redis y Node.js core automáticamente. Para operaciones de negocio que quieras ver en Tempo:

```typescript
import { trace, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('fullstack-api');

async function processPayment(paymentId: string) {
  return tracer.startActiveSpan('payment.process', async (span) => {
    try {
      span.setAttributes({
        'payment.id':       paymentId,
        'payment.provider': 'stripe',
      });

      const result = await stripeService.charge(paymentId);

      span.setStatus({ code: SpanStatusCode.OK });
      return result;
    } catch (err) {
      span.setStatus({ code: SpanStatusCode.ERROR, message: (err as Error).message });
      span.recordException(err as Error);
      throw err;
    } finally {
      span.end();
    }
  });
}
```

**Convención de nombres de spans:** `{dominio}.{verbo}` en snake_case.

| Bueno | Malo |
|---|---|
| `payment.process` | `processPayment` |
| `invoice.generate_pdf` | `GeneratePDF` |
| `email.send_verification` | `sendEmail` |

### 6.4 Crear métricas personalizadas

El auto-instrumentation genera métricas HTTP (`http_server_duration_milliseconds`) y de proceso automáticamente. Para métricas de negocio:

```typescript
import { metrics } from '@opentelemetry/api';

const meter = metrics.getMeter('fullstack-api');

// Counter — solo incrementa
const invoicesCreated = meter.createCounter('invoices.created', {
  description: 'Number of invoices created',
});

// Histogram — distribución de valores (latencia, tamaño)
const paymentDuration = meter.createHistogram('payment.duration', {
  description: 'Payment processing duration',
  unit: 'ms',
});

// Usage
invoicesCreated.add(1, { 'invoice.type': 'recurring' });
paymentDuration.record(142, { 'payment.provider': 'stripe' });
```

**Convención de nombres de métricas:** `{dominio}.{nombre}` en snake_case. La unidad va en el `unit` field, no en el nombre.

### 6.5 Loguear desde fuera de una HTTP request

El logger de `nestjs-pino` a través de `PinoLogger` funciona en cualquier contexto. Fuera de una request HTTP (jobs, event listeners, scheduled tasks), los campos `requestId` y `userId` no estarán disponibles — eso es correcto.

```typescript
@Injectable()
export class AuditLogListener {
  constructor(
    @InjectPinoLogger(AuditLogListener.name)
    private readonly logger: PinoLogger,
  ) {}

  @OnEvent('auth.sign_in')
  async handle(event: SignInEvent) {
    this.logger.info(
      { userId: event.userId, eventType: 'sign_in' },
      'Audit event recorded',
    );
  }
}
```

---

## 7. Stack local de observabilidad

### Prerequisitos

- Docker Desktop instalado y corriendo
- `OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318` en `apps/api/.env`

### Levantar el stack

```bash
docker compose -f docker-compose.observability.yml up -d
```

### Puertos

| Servicio | Puerto host | Uso |
|---|---|---|
| Grafana | **8080** | UI principal — Explore → Loki/Tempo/Prometheus |
| OTel Collector (OTLP HTTP) | **4318** | El API envía telemetría aquí |
| OTel Collector (OTLP gRPC) | 4317 | Alternativa gRPC |
| OTel Collector (self-metrics) | 8889 | Prometheus scrapes aquí |
| OTel Collector (health) | 13133 | `curl http://localhost:13133/` |
| Loki | 3100 | Logs (interno al Collector) |
| Prometheus | 9090 | Métricas UI + remote write |
| Tempo (HTTP API) | 3200 | Traces (interno a Grafana) |
| Tempo (gRPC) | 9095 | Queries gRPC |

### Verificar que el stack funciona

```bash
# 1. Collector healthy
curl http://localhost:13133/
# → {"status":"Server available",...}

# 2. Metrics endpoint activo
curl -s http://localhost:8889/metrics | head -3
# → # HELP otelcol_process_uptime ...

# 3. El API está enviando spans
curl -s http://localhost:8889/metrics | grep otelcol_receiver_accepted_spans
# → otelcol_receiver_accepted_spans{...} > 0

# 4. Spans llegando a Tempo
curl -s http://localhost:8889/metrics | grep otelcol_exporter_sent_spans
# → otelcol_exporter_sent_spans{exporter="otlphttp/tempo",...} > 0

# 5. Métricas llegando a Prometheus
curl -s http://localhost:8889/metrics | grep otelcol_exporter_sent_metric_points
# → otelcol_exporter_sent_metric_points{exporter="prometheusremotewrite",...} > 0
```

### Ver traces en Grafana

1. Abrir **http://localhost:8080**
2. Sidebar → **Explore**
3. Datasource: **Tempo**
4. Query type: **Search** → Service Name: `fullstack-api`
5. **Run query**

### Ver logs en Grafana

> Los logs solo fluyen via OTLP cuando `NODE_ENV=production`. Para testing local:
> ```bash
> NODE_ENV=production npm run dev -w apps/api
> ```

1. Grafana → **Explore**
2. Datasource: **Loki**
3. Query: `{service_name="fullstack-api"}`

### Correlación log ↔ trace

Si un log tiene `traceId`, Grafana muestra el botón **"View Trace"** que salta directamente al span en Tempo. Esto funciona automáticamente gracias al `derivedFields` configurado en el datasource de Loki.

### Apagar el stack

```bash
docker compose -f docker-compose.observability.yml down
```

---

## 8. Sentry

Sentry captura excepciones 5xx con stack trace completo. Es **complementario** a los logs de Loki — Loki indexa el `errorCode` para alertas, Sentry tiene el contexto completo para debugging.

### Configuración

```typescript
// apps/api/src/instrument.ts — cargado antes que otel.ts en producción
import * as Sentry from '@sentry/nestjs';

if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    release: process.env.GIT_SHA,
    environment: process.env.NODE_ENV ?? 'development',

    // Solo errores 5xx — los 4xx son errores del cliente, no del servicio
    beforeSend(event) {
      const status = event.extra?.['status'] as number | undefined;
      if (status && status < 500) return null;
      return event;
    },
  });
}
```

### Capturar en el filtro global

```typescript
// all-exceptions.filter.ts
import * as Sentry from '@sentry/nestjs';

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    Sentry.captureException(exception);
    this.logger.error({ errorCode: 'INTERNAL_ERROR', err: exception }, 'Unhandled exception');
    // ...
  }
}
```

### Variables de entorno

```bash
SENTRY_DSN=https://xxxx@yyyy.ingest.sentry.io/zzzz
GIT_SHA=abc1234   # injected from $GITHUB_SHA in CI
```

Si `SENTRY_DSN` está ausente, `instrument.ts` salta el `Sentry.init()` — el API arranca sin errores.

---

## 9. Variables de entorno

```bash
# ── Observabilidad (todas opcionales — el API arranca sin ellas) ─────────────

# SERVICE_NAME es la única REQUERIDA — Zod la valida al arranque.
# Formato: {proyecto}-{dominio}, lowercase, hyphen-separated
# Ejemplo: spacars-api, kaizen-admin, fullstack-api
SERVICE_NAME=fullstack-api

SERVICE_VERSION=0.0.0        # injected from package.json en CI/CD
SERVICE_NAMESPACE=default    # grupo lógico de servicios del mismo producto
LOG_LEVEL=info               # debug | info | warn | error | fatal

# Endpoint del OTel Collector — sin trailing slash
# Local:       http://localhost:4318
# Docker:      http://otel-collector:4318
# Producción:  https://otel-collector.internal:4318
# Omitir para arrancar sin telemetría (no-op mode)
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318

# Sentry — omitir para deshabilitar
SENTRY_DSN=
GIT_SHA=                     # injected from $GITHUB_SHA en CI/CD
```

### Qué pasa si falta cada variable

| Variable | Default | Comportamiento sin ella |
|---|---|---|
| `SERVICE_NAME` | ninguno | **El proceso no arranca** — Zod error |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | ninguno | SDK en no-op — spans y métricas generados pero descartados |
| `SENTRY_DSN` | ninguno | `instrument.ts` salta `Sentry.init()` — sin errores |
| `GIT_SHA` | ninguno | Campo `release` de Sentry queda en blanco |
| `LOG_LEVEL` | `info` | Fallback a `info` |
| `SERVICE_VERSION` | `0.0.0` | Aparece `0.0.0` en logs y traces |
| `SERVICE_NAMESPACE` | `default` | Aparece `default` en OTel resource attrs |

---

## 10. Producción

### Cambios obligatorios vs. configuración local

| Aspecto | Local | Producción |
|---|---|---|
| Endpoint | `http://localhost:4318` | `https://collector.internal:4318` |
| TLS | Deshabilitado (`insecure: true`) | Certificado válido |
| Autenticación backends | Sin autenticación | Credentials configuradas en el Collector |
| Storage Tempo | Local (`/tmp/tempo/blocks`) | Object storage (S3, GCS, Azure Blob) |
| Storage Loki | Local config | Persistent volume |
| Storage Prometheus | Efímero | Persistent volume |
| `LOG_LEVEL` | `debug` | `info` |
| `NODE_ENV` | `development` | `production` |

### Logs en producción — `pino-opentelemetry-transport`

En producción, `pino.config.ts` usa `pino-opentelemetry-transport` como transport. Este paquete envía cada línea de log como un OTLP log record al endpoint configurado en la variable de entorno `OTEL_EXPORTER_OTLP_ENDPOINT`.

El Collector recibe los logs en el pipeline `logs` y los reenvía a Loki.

### Deployment order en producción

```
1. OTel Collector disponible
2. Servicios arrancan con OTEL_EXPORTER_OTLP_ENDPOINT seteado
```

Si el Collector no está disponible al arranque, el SDK y el transport hacen reintentos automáticos con backoff exponencial. El servicio no falla por ausencia del Collector.

### `SERVICE_VERSION` y `GIT_SHA` en CI/CD

```yaml
# GitHub Actions — ejemplo
- name: Deploy API
  env:
    SERVICE_VERSION: ${{ github.ref_name }}   # e.g. "v1.4.2"
    GIT_SHA: ${{ github.sha }}
```

Estos dos valores son lo que permite correlacionar un error en Sentry o un spike en Grafana con un deploy específico.

---

## 11. Checklist pre-producción

### OTel SDK

- [ ] `SERVICE_NAME` seteado — formato `{proyecto}-{dominio}`, lowercase, hyphen-separated
- [ ] `SERVICE_VERSION` injected desde el proceso de build (no hardcodeado)
- [ ] `otel.ts` cargado con `--require` antes del bundle principal, **no** via import en `main.ts`
- [ ] `OTEL_EXPORTER_OTLP_ENDPOINT` apunta al Collector de producción (HTTPS)
- [ ] `@opentelemetry/instrumentation-fs` deshabilitado — genera demasiado noise

### Logs

- [ ] `LOG_LEVEL=info` en producción (no `debug`)
- [ ] `NODE_ENV=production` activa `pino-opentelemetry-transport`
- [ ] Ningún log contiene email, IP, password, token, o secret en texto plano
- [ ] Todos los logs de `error` incluyen `errorCode`
- [ ] Todos los logs de `error` incluyen `err` (el objeto de error, no el mensaje)
- [ ] Todos los logs de `warn` incluyen `errorCode`
- [ ] `errorStack` nunca se emite en producción (verificado en `buildErrSerializer`)
- [ ] `userId` se propaga via `logger.assign()` en el after-hook de sign-in y sign-up
- [ ] Rutas de health check excluidas del logging automático (`autoLogging.ignore`)

### Filters

- [ ] `AllExceptionsFilter` loguea `{ errorCode: 'INTERNAL_ERROR', err: exception }`
- [ ] `AllExceptionsFilter` captura en Sentry via `captureException(exception)`
- [ ] `HttpExceptionFilter` usa `logger.error` para status ≥ 500, `logger.warn` para 4xx
- [ ] `DomainExceptionFilter` usa `logger.warn` con `{ errorCode: exception.error }`

### Collector (responsabilidad del equipo de infra)

- [ ] TLS habilitado en todos los exporters (`insecure: false`)
- [ ] Autenticación configurada para Loki, Prometheus y Tempo
- [ ] `memory_limiter` activo (previene OOM bajo carga alta)
- [ ] Al menos 2 réplicas del Collector en producción
- [ ] Storage de Tempo migrado de `local` a object storage
- [ ] Persistent volumes para Loki y Prometheus

### Sentry

- [ ] `SENTRY_DSN` configurado para el proyecto correcto (NestJS / Node.js)
- [ ] `GIT_SHA` injected desde `$GITHUB_SHA` en el pipeline de CI/CD
- [ ] `beforeSend` filtra 4xx — solo errores 5xx llegan a Sentry
- [ ] Alert rule en Sentry para errores nuevos post-deploy

### Grafana

- [ ] Datasources Loki, Prometheus, Tempo provisionados automáticamente
- [ ] Log-to-trace correlation funcionando (`derivedFields` en datasource de Loki)
- [ ] Trace-to-log correlation funcionando (`tracesToLogsV2` en datasource de Tempo)
- [ ] Al menos un dashboard básico: HTTP request rate, error rate, P95 latency
- [ ] Alert rule en Grafana para error rate > umbral en ventana de 5 min
