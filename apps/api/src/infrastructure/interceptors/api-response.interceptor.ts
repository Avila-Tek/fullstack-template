import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SKIP_API_RESPONSE } from './skip-api-response.decorator.js';

interface ApiResponse<T> {
  success: boolean;
  code: number;
  data: T | null;
  error: string | null;
  message: string | null;
}

function isAlreadyShaped(value: unknown): value is ApiResponse<unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'success' in value &&
    'code' in value
  );
}

@Injectable()
export class ApiResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T> | T>
{
  constructor(private readonly reflector: Reflector) {}

  intercept(
    context: ExecutionContext,
    next: CallHandler<T>,
  ): Observable<ApiResponse<T> | T> {
    const skip = this.reflector.getAllAndOverride<boolean>(SKIP_API_RESPONSE, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skip) return next.handle();

    const res = context.switchToHttp().getResponse<{ statusCode: number }>();

    return next.handle().pipe(
      map((data) => {
        if (isAlreadyShaped(data)) return data;
        return {
          success: true,
          code: res.statusCode ?? 200,
          data: data ?? null,
          error: null,
          message: null,
        };
      }),
    );
  }
}
