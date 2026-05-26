import { ArgumentsHost, Catch, ExceptionFilter, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import type { IncomingMessage } from 'node:http';
import { DomainException } from '../../shared/domain-exception.js';
import { domainToHttpStatus } from '../mapping/domain-to-http.mapper.js';
import { domainErrorMessage } from '../i18n/domain-messages.js';
import { detectLocale } from '../i18n/locale.js';

@Catch(DomainException)
@Injectable()
export class DomainExceptionFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(DomainExceptionFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const req = ctx.getRequest<IncomingMessage>();
    const res = ctx.getResponse<{ status(c: number): { send(b: unknown): void } }>();
    const status = domainToHttpStatus(exception.error);
    const locale = detectLocale(req);
    const message = domainErrorMessage(exception.error, locale);

    // Schema standard: domain exceptions are handled failures — warn level (not crashes)
    this.logger.warn({ errorCode: exception.error }, 'Domain exception');

    res.status(status).send({
      success: false,
      code: status,
      data: null,
      error: exception.error,
      message,
    });
  }
}
