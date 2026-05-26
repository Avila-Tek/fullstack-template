import type { IncomingMessage } from 'node:http';
import type { Params } from 'nestjs-pino';
import { env } from '../../env.js';

const isProduction = env.NODE_ENV === 'production';

/**
 * Builds the pino `err` serializer for the given environment.
 * - Production: drops `stack` (stack traces belong in Sentry, not Loki)
 * - Non-production: keeps `stack` for local debugging
 */
export function buildErrSerializer(
  production: boolean,
): (err: Error) => Record<string, unknown> {
  if (production) {
    return (err: Error) => ({ type: err.name, message: err.message });
  }
  return (err: Error) => ({ type: err.name, message: err.message, stack: err.stack });
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
      // Inject static service metadata into every log line (HTTP and non-HTTP alike).
      // Returning a clean object also drops "pid" and "hostname" which are not in the schema.
      bindings(_bindings) {
        return {
          'service.name': env.SERVICE_NAME,
          'service.version': env.SERVICE_VERSION,
          'deployment.environment': env.NODE_ENV,
        };
      },
    },

    // Schema standard: HTTP response duration must be "durationMs", not "responseTime"
    customAttributeKeys: { responseTime: 'durationMs' },

    // Schema standard: errorStack must not appear in production logs
    serializers: { err: buildErrSerializer(isProduction) },

    // In production, ship logs to the OTel collector via pino-opentelemetry-transport.
    // In dev, pretty-print to stdout.
    transport: isProduction
      ? {
          target: 'pino-opentelemetry-transport',
          options: {
            resourceAttributes: {
              'service.name': env.SERVICE_NAME,
              'service.version': env.SERVICE_VERSION,
              'deployment.environment': env.NODE_ENV,
            },
          },
        }
      : {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard' },
        },

    // Schema standard: field is "requestId", not "correlationId"
    // The OTel baggage key stays "correlation.id" — only the log field name changes.
    customProps(req: IncomingMessage) {
      const correlationId = (req as IncomingMessage & { correlationId?: string }).correlationId;
      return correlationId ? { requestId: correlationId } : {};
    },

    // Redact sensitive fields
    redact: {
      paths: ['req.headers.authorization', 'req.headers.cookie', 'req.body.password'],
      censor: '[REDACTED]',
    },

    // Suppress health-check noise
    autoLogging: {
      ignore(req) {
        return (req as { url?: string }).url?.startsWith('/health') ?? false;
      },
    },
  },
};
