import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import * as Sentry from '@sentry/nestjs';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    Sentry.captureException(exception);

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
