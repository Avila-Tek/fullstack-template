import { trace } from '@opentelemetry/api';
import { redactPii } from '@zoom/utils';
import type { Params } from 'nestjs-pino';
import { env } from '../../env';

export function pinoHttpConfig(serviceName: string): Params {
	return {
		pinoHttp: {
			level: env.LOG_LEVEL,
			transport:
				env.NODE_ENV !== 'production'
					? { target: 'pino-pretty' }
					: { target: 'pino-opentelemetry-transport' },
			serializers: {
				req: (req: {
					method: string;
					url: string;
					headers?: Record<string, string>;
					remoteAddress?: string;
				}) => ({
					method: req.method,
					path: req.url,
					correlationId: (req as Record<string, unknown>).correlationId,
					sourceIp: req.headers?.['x-forwarded-for'] ?? req.remoteAddress ?? '',
				}),
				res: (res: { statusCode: number }) => ({
					statusCode: res.statusCode,
				}),
			},
			mixin: () => {
				const span = trace.getActiveSpan();
				const ctx = span?.spanContext();
				return {
					service: serviceName,
					env: env.NODE_ENV,
					traceId: ctx?.traceId ?? '',
					spanId: ctx?.spanId ?? '',
				};
			},
			formatters: {
				log: (obj: Record<string, unknown>) => redactPii(obj),
			},
		},
	};
}
