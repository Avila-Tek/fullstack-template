import {
	type ArgumentsHost,
	Catch,
	type ExceptionFilter,
	Inject,
} from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';
import type { ApiResponse } from '@zoom/schemas';
import {
	DomainException,
	httpMessages,
	type IStructuredLogger,
	LOGGER_PORT,
	parseLocale,
	resolveMessage,
	type SupportedLocale,
} from '@zoom/utils';
import type { Request, Response } from 'express';
import { authDomainMessages } from '../i18n/domain-messages';
import { DomainToHttpMapper } from '../mapping/domain-to-http.mapper';

const catalog = authDomainMessages as Record<
	string,
	Record<SupportedLocale, string>
>;

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
	constructor(
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
		@Inject(DomainToHttpMapper)
		private readonly mapper: DomainToHttpMapper,
	) {}

	catch(exception: DomainException, host: ArgumentsHost): void {
		const ctx = host.switchToHttp();
		const req = ctx.getRequest<Request>();
		const res = ctx.getResponse<Response>();
		const status = this.mapper.map(exception.error);
		const locale = parseLocale(req.headers['accept-language']);
		const fallback = httpMessages.INTERNAL_ERROR[locale];
		const message = resolveMessage(catalog, exception.error, locale, fallback);

		this.logger.warn(
			{
				event: 'http.exception.handled',
				error: exception.error,
				meta: exception.meta ?? null,
			},
			exception.message,
		);

		// Capture to Sentry only when the domain error maps to a server fault
		// (5xx). Client-mapped domain errors (404, 422, 409, etc.) are
		// expected user-facing failures — reporting them would flood the quota.
		// Pass httpStatus via hint.data so beforeSend (T10) can also recognize
		// domain exceptions whose .status field is undefined.
		if (status >= 500) {
			Sentry.getCurrentScope().setTag('domain_error', exception.error);
			Sentry.captureException(exception, {
				mechanism: {
					handled: true,
					type: 'auto.http.nestjs.domain_exception_filter',
				},
				data: { httpStatus: status },
			});
		}

		// Status ≥ 500 always resolves to INTERNAL_ERROR — never leak raw
		// error details to the client. The original domain code stays in
		// logs (above) and on the Sentry `domain_error` tag for incident
		// triage.
		const isServerFault = status >= 500;
		const body: ApiResponse<null> = {
			code: status,
			data: null,
			error: isServerFault ? 'INTERNAL_ERROR' : exception.error,
			message: isServerFault ? httpMessages.INTERNAL_ERROR[locale] : message,
			success: false,
		};

		res.status(status).json(body);
	}
}
