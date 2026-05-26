import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import type { PinoLogger } from 'nestjs-pino';
import { AllExceptionsFilter } from '../../../infrastructure/filters/all-exceptions.filter.js';

vi.mock('@sentry/nestjs', () => ({
  captureException: vi.fn(),
}));

function buildHost(sendFn = vi.fn()) {
  const status = vi.fn().mockReturnValue({ send: sendFn });
  return {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
    _send: sendFn,
    _status: status,
  };
}

function buildMockLogger() {
  return {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  } as unknown as PinoLogger;
}

describe('AllExceptionsFilter', () => {
  let mockLogger: PinoLogger;
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    mockLogger = buildMockLogger();
    filter = new AllExceptionsFilter(mockLogger);
  });

  it('responds with 500 INTERNAL_ERROR for any exception', () => {
    const { _send, _status, ...host } = buildHost();

    filter.catch(new Error('Unexpected'), host as unknown as ArgumentsHost);

    expect(_status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(_send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        code: HttpStatus.INTERNAL_SERVER_ERROR,
        error: 'INTERNAL_ERROR',
        data: null,
      }),
    );
  });

  it('captures the exception in Sentry', async () => {
    const Sentry = await import('@sentry/nestjs');
    const { _send, _status, ...host } = buildHost();

    const err = new Error('boom');
    filter.catch(err, host as unknown as ArgumentsHost);

    expect(Sentry.captureException).toHaveBeenCalledWith(err);
  });

  it('logs a structured error with errorCode INTERNAL_ERROR', () => {
    const { _send, _status, ...host } = buildHost();

    filter.catch(new Error('boom'), host as unknown as ArgumentsHost);

    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'INTERNAL_ERROR' }),
      expect.any(String),
    );
  });
});
