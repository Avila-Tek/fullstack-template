import type { IStructuredLogger } from '@zoom/utils';
import pino from 'pino';
import { env } from '../../env';

export class ScriptLogger implements IStructuredLogger {
	private readonly logger = pino({
		level: env.LOG_LEVEL,
		transport:
			env.NODE_ENV !== 'production' ? { target: 'pino-pretty' } : undefined,
	});

	info(obj: Record<string, unknown>, msg?: string): void {
		this.logger.info(obj, msg);
	}

	warn(obj: Record<string, unknown>, msg?: string): void {
		this.logger.warn(obj, msg);
	}

	error(obj: Record<string, unknown>, msg?: string): void {
		this.logger.error(obj, msg);
	}

	debug(obj: Record<string, unknown>, msg?: string): void {
		this.logger.debug(obj, msg);
	}
}
