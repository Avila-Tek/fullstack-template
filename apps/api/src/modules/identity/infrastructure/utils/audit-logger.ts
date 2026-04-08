import { trace } from '@opentelemetry/api';
import pino from 'pino';
import { type IStructuredLogger, redactPii } from '@/shared/domain-utils';

// Module-level pino logger used by Better Auth hooks that run outside NestJS DI.
// Configured identically to the nestjs-pino LoggerModule so all audit logs share
// the same structured format regardless of call site.
export const auditLogger: IStructuredLogger = pino({
	level: process.env.LOG_LEVEL ?? 'info',
	transport:
		process.env.NODE_ENV !== 'production'
			? { target: 'pino-pretty' }
			: { target: 'pino-opentelemetry-transport' },
	mixin: () => {
		const span = trace.getActiveSpan();
		const ctx = span?.spanContext();
		return {
			service: 'identity',
			env: process.env.NODE_ENV ?? 'development',
			traceId: ctx?.traceId ?? '',
			spanId: ctx?.spanId ?? '',
		};
	},
	formatters: {
		log: (obj: Record<string, unknown>) => redactPii(obj),
	},
});
