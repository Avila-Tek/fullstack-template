import {
	type ArgumentsHost,
	Catch,
	type ExceptionFilter,
	Inject,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { ApiResponse } from '@zoom/schemas';
import {
	httpMessages,
	type IStructuredLogger,
	LOGGER_PORT,
	parseLocale,
	resolveMessage,
} from '@zoom/utils';
import type { Request, Response } from 'express';
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

		const cause = err.cause instanceof Error ? err.cause : undefined;
		this.logger.error(
			{
				event: 'http.exception.unhandled',
				errorName: err.name,
				message: err.message,
				stack: err.stack,
				...(cause && { cause: cause.message, causeStack: cause.stack }),
			},
			'Unhandled exception',
		);

		incrementServerError({
			app: 'zoom-api',
			status_code: '500',
			error_code: 'INTERNAL_ERROR',
		});

		// Report to Sentry. handled:false because the error escaped every typed
		// filter (Domain/Http) and landed in the catch-all — by definition
		// unhandled by application code.
		Sentry.captureException(err, {
			mechanism: {
				handled: false,
				type: 'auto.http.nestjs.all_exceptions_filter',
			},
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
