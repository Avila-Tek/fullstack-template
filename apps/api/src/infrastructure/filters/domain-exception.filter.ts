import { ArgumentsHost, Catch, ExceptionFilter } from '@nestjs/common';
import { DomainException } from '../../shared/domain-exception';
import { domainToHttpStatus } from '../mapping/domain-to-http.mapper';
import { domainErrorMessage } from '../i18n/domain-messages';

@Catch(DomainException)
export class DomainExceptionFilter implements ExceptionFilter {
  catch(exception: DomainException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<{ status(c: number): { send(b: unknown): void } }>();
    const status = domainToHttpStatus(exception.error);
    const message = domainErrorMessage(exception.error);

    res.status(status).send({
      success: false,
      code: status,
      data: null,
      error: exception.error,
      message,
    });
  }
}
