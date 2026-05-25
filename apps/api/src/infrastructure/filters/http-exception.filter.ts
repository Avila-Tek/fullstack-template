import { ArgumentsHost, Catch, ExceptionFilter, HttpException } from '@nestjs/common';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<{ status(c: number): { send(b: unknown): void } }>();
    const status = exception.getStatus();
    const raw = exception.getResponse();

    const isObj = typeof raw === 'object' && raw !== null;
    const message = isObj
      ? ((raw as { message?: string | string[] }).message ?? exception.message)
      : (raw as string);
    const errorCode = isObj
      ? ((raw as { error?: string }).error ?? httpStatusToCode(status))
      : httpStatusToCode(status);

    res.status(status).send({
      success: false,
      code: status,
      data: null,
      error: errorCode,
      message: Array.isArray(message) ? message[0] : message,
    });
  }
}

function httpStatusToCode(status: number): string {
  const map: Record<number, string> = {
    400: 'BAD_REQUEST',
    401: 'UNAUTHORIZED',
    403: 'FORBIDDEN',
    404: 'NOT_FOUND',
    409: 'CONFLICT',
    422: 'UNPROCESSABLE_ENTITY',
    429: 'TOO_MANY_REQUESTS',
    500: 'INTERNAL_SERVER_ERROR',
    503: 'SERVICE_UNAVAILABLE',
  };
  return map[status] ?? `HTTP_${status}`;
}
