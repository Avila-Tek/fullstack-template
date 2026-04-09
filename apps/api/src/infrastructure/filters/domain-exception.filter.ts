import {
	type ArgumentsHost,
	Catch,
	type ExceptionFilter,
	Inject,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import {
	DomainException,
	httpMessages,
	type IStructuredLogger,
	LOGGER_PORT,
	parseLocale,
	resolveMessage,
	type SupportedLocale,
} from '@/shared/domain-utils';
import type { ApiResponse } from '@/shared/types/api-response.types';
import { domainMessages } from '../i18n/domain-messages';
import { DomainToHttpMapper } from '../mapping/domain-to-http.mapper';

const catalog = domainMessages as Record<
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

		const detail =
			typeof exception.meta?.reason === 'string'
				? resolveMessage(catalog, exception.meta.reason, locale, '') || undefined
				: undefined;

		const body: ApiResponse<null> = {
			code: status,
			data: null,
			...(detail !== undefined && { detail }),
			error: exception.error,
			message,
			success: false,
		};

		res.status(status).json(body);
	}
}
