import type { Params } from 'nestjs-pino';
import { env } from '../../env.js';

const isProduction = env.NODE_ENV === 'production';

export const pinoConfig: Params = {
  pinoHttp: {
    level: env.LOG_LEVEL,

    // In production, ship logs to the OTel collector via pino-opentelemetry-transport.
    // In dev, pretty-print to stdout.
    transport: isProduction
      ? {
          target: 'pino-opentelemetry-transport',
          options: {
            resourceAttributes: {
              'service.name': env.SERVICE_NAME,
              'service.version': env.SERVICE_VERSION,
            },
          },
        }
      : {
          target: 'pino-pretty',
          options: { colorize: true, translateTime: 'SYS:standard', ignore: 'pid,hostname' },
        },

    // Attach correlation-id to every log line
    customProps(req: Record<string, unknown>) {
      return { correlationId: req['correlationId'] };
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
