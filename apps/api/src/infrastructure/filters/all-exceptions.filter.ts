import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus, Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as Sentry from '@sentry/nestjs';

@Catch()
@Injectable()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @InjectPinoLogger(AllExceptionsFilter.name)
    private readonly logger: PinoLogger,
  ) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    Sentry.captureException(exception);

    this.logger.error({ errorCode: 'INTERNAL_ERROR' }, 'Unhandled exception');

    const ctx = host.switchToHttp();
    const res = ctx.getResponse<{ status(c: number): { send(b: unknown): void } }>();

    res.status(HttpStatus.INTERNAL_SERVER_ERROR).send({
      success: false,
      code: HttpStatus.INTERNAL_SERVER_ERROR,
      data: null,
      error: 'INTERNAL_ERROR',
      message: 'Error interno del servidor',
    });
  }
}
