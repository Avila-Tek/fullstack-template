import { describe, it, expect, vi } from 'vitest';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, lastValueFrom } from 'rxjs';
import { ApiResponseInterceptor } from '../../../infrastructure/interceptors/api-response.interceptor';

function buildContext(): ExecutionContext {
  return {
    switchToHttp: () => ({
      getResponse: () => ({ statusCode: 200 }),
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;
}

function buildReflector(skip = false): Reflector {
  return {
    getAllAndOverride: vi.fn().mockReturnValue(skip),
  } as unknown as Reflector;
}

describe('ApiResponseInterceptor', () => {
  it('wraps a plain value in the standard success shape', async () => {
    const interceptor = new ApiResponseInterceptor(buildReflector(false));
    const handler: CallHandler = { handle: () => of({ id: 1, name: 'Alice' }) };
    const result = await lastValueFrom(interceptor.intercept(buildContext(), handler));

    expect(result).toEqual({
      success: true,
      code: 200,
      data: { id: 1, name: 'Alice' },
      error: null,
      message: null,
    });
  });

  it('wraps null in the standard success shape', async () => {
    const interceptor = new ApiResponseInterceptor(buildReflector(false));
    const handler: CallHandler = { handle: () => of(null) };
    const result = await lastValueFrom(interceptor.intercept(buildContext(), handler));

    expect(result).toEqual({
      success: true,
      code: 200,
      data: null,
      error: null,
      message: null,
    });
  });

  it('does not double-wrap already-shaped responses', async () => {
    const interceptor = new ApiResponseInterceptor(buildReflector(false));
    const alreadyShaped = { success: true, code: 200, data: 'hello', error: null, message: null };
    const handler: CallHandler = { handle: () => of(alreadyShaped) };
    const result = await lastValueFrom(interceptor.intercept(buildContext(), handler));
    expect(result).toEqual(alreadyShaped);
  });

  it('passes through raw response when @SkipApiResponse() is set', async () => {
    const interceptor = new ApiResponseInterceptor(buildReflector(true));
    const raw = [1, 2, 3];
    const handler: CallHandler = { handle: () => of(raw) };
    const result = await lastValueFrom(interceptor.intercept(buildContext(), handler));
    expect(result).toEqual(raw);
  });
});
