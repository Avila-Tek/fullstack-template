import { trace } from '@opentelemetry/api';
import type { Params } from 'nestjs-pino';
import { redactPii } from '@/shared/domain-utils';

export function pinoHttpConfig(serviceName: string): Params {
	return {
		pinoHttp: {
			level: process.env.LOG_LEVEL ?? 'info',
			transport:
				process.env.NODE_ENV !== 'production'
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
					env: process.env.NODE_ENV ?? 'development',
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
