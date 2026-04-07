import {
	type ArgumentsHost,
	Catch,
	type ExceptionFilter,
	Inject,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
	httpMessages,
	type IStructuredLogger,
	LOGGER_PORT,
	parseLocale,
	resolveMessage,
} from '@/shared/domain-utils';
import type { ApiResponse } from '@/shared/types/api-response.types';
import { incrementServerError } from '../../shared/metrics/server-errors.metric';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
	constructor(
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	catch(exception: unknown, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const req =
			typeof ctx.getRequest === 'function'
				? ctx.getRequest<Request | undefined>()
				: undefined;
		const res = ctx.getResponse<Response>();

		const err =
			exception instanceof Error ? exception : new Error(String(exception));

		this.logger.error(
			{
				event: 'http.exception.unhandled',
				errorName: err.name,
				message: err.message,
				stack: err.stack,
			},
			'Unhandled exception',
		);

		incrementServerError({
			app: 'zoom-api',
			status_code: '500',
			error_code: 'INTERNAL_ERROR',
		});

		const locale = parseLocale(req?.headers?.['accept-language']);
		const message = resolveMessage(
			httpMessages,
			'INTERNAL_ERROR',
			locale,
			httpMessages.INTERNAL_ERROR[locale],
		);

		const body: ApiResponse<null> = {
			code: 500,
			data: null,
			error: 'INTERNAL_ERROR',
			message,
			success: false,
		};

		res.status(500).json(body);
	}
}
