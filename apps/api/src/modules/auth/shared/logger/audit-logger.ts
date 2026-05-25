import { trace } from '@opentelemetry/api';
import { type IStructuredLogger, redactPii } from '@zoom/utils';
import pino from 'pino';
import { env } from '../../env';

// Module-level pino logger used by Better Auth hooks that run outside NestJS DI.
// Configured identically to the nestjs-pino LoggerModule so all audit logs share
// the same structured format regardless of call site.
export const auditLogger: IStructuredLogger = pino({
	level: env.LOG_LEVEL,
	transport:
		env.NODE_ENV !== 'production'
			? { target: 'pino-pretty' }
			: { target: 'pino-opentelemetry-transport' },
	mixin: () => {
		const span = trace.getActiveSpan();
		const ctx = span?.spanContext();
		return {
			service: 'zoom-auth',
			env: env.NODE_ENV,
			traceId: ctx?.traceId ?? '',
			spanId: ctx?.spanId ?? '',
		};
	},
	formatters: {
		log: (obj: Record<string, unknown>) => redactPii(obj),
	},
});
