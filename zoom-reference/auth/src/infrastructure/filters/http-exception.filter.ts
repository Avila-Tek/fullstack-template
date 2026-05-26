import {
	type ArgumentsHost,
	Catch,
	type ExceptionFilter,
	HttpException,
	Inject,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { ApiResponse, FieldError } from '@zoom/schemas';
import {
	type HttpErrorCode,
	httpMessages,
	type IStructuredLogger,
	LOGGER_PORT,
	parseLocale,
	resolveMessage,
} from '@zoom/utils';
import type { Request, Response } from 'express';
import { incrementServerError } from '../../shared/metrics/server-errors.metric';

const HTTP_ERROR_CODES: Record<number, HttpErrorCode> = {
	400: 'VALIDATION_ERROR',
	401: 'UNAUTHORIZED',
	403: 'FORBIDDEN',
	404: 'NOT_FOUND',
};

function extractErrors(response: unknown): FieldError[] | undefined {
	if (typeof response !== 'object' || response === null) return undefined;

	const r = response as Record<string, unknown>;

	// Zod flatten() shape: { formErrors: string[], fieldErrors: Record<string, string[]> }
	if (
		'fieldErrors' in r &&
		typeof r.fieldErrors === 'object' &&
		r.fieldErrors !== null
	) {
		const fieldErrors = r.fieldErrors as Record<string, string[] | undefined>;
		const entries: FieldError[] = [];

		for (const [field, messages] of Object.entries(fieldErrors)) {
			for (const msg of messages ?? []) {
				entries.push({ field, message: msg, error: 'VALIDATION_ERROR' });
			}
		}

		if ('formErrors' in r && Array.isArray(r.formErrors)) {
			for (const msg of r.formErrors as string[]) {
				entries.push({ message: msg, error: 'VALIDATION_ERROR' });
			}
		}

		return entries.length > 0 ? entries : undefined;
	}

	return undefined;
}

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
	constructor(
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	catch(exception: HttpException, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const req = ctx.getRequest<Request>();
		const res = ctx.getResponse<Response>();
		const status = exception.getStatus();
		const response = exception.getResponse();

		const errorCode = HTTP_ERROR_CODES[status] ?? 'INTERNAL_ERROR';
		const locale = parseLocale(req.headers['accept-language']);
		const message = resolveMessage(
			httpMessages,
			errorCode,
			locale,
			httpMessages.INTERNAL_ERROR[locale],
		);

		const rawMessage =
			typeof response === 'object' && response !== null && 'message' in response
				? String((response as Record<string, unknown>).message)
				: exception.message;

		if (status >= 500) {
			this.logger.error(
				{
					event: 'http.exception.server_error',
					status,
					errorCode,
					message: rawMessage,
				},
				'HTTP server error',
			);
			incrementServerError({
				app: 'zoom-auth',
				status_code: String(status),
				error_code: errorCode,
			});
			// Capture to Sentry only on 5xx. Client errors (4xx) are user-facing
			// validation/auth failures — reporting them would flood the quota.
			Sentry.captureException(exception, {
				mechanism: {
					handled: true,
					type: 'auto.http.nestjs.http_exception_filter',
				},
			});
		} else {
			this.logger.warn(
				{ event: 'http.exception.client_error', status, errorCode },
				exception.message,
			);
		}

		const errors = extractErrors(response);

		const body: ApiResponse<null> = {
			code: status,
			data: null,
			error: errorCode,
			message,
			success: false,
			...(errors ? { errors } : {}),
		};

		res.status(status).json(body);
	}
}
