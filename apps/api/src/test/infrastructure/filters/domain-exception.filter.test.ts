import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import type { PinoLogger } from 'nestjs-pino';
import { DomainExceptionFilter } from '../../../infrastructure/filters/domain-exception.filter.js';
import { DomainException } from '../../../shared/domain-exception.js';

function buildHost(sendFn = vi.fn()) {
  const status = vi.fn().mockReturnValue({ send: sendFn });
  // getRequest needed for locale detection inside the filter
  const getRequest = vi.fn().mockReturnValue({ headers: {} });
  return {
    switchToHttp: () => ({ getResponse: () => ({ status }), getRequest }),
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

describe('DomainExceptionFilter', () => {
  let mockLogger: PinoLogger;
  let filter: DomainExceptionFilter;

  beforeEach(() => {
    mockLogger = buildMockLogger();
    filter = new DomainExceptionFilter(mockLogger);
  });

  it('responds with 422 for unknown domain error by default', () => {
    const { _send, _status, ...host } = buildHost();
    filter.catch(
      new DomainException('UNKNOWN_DOMAIN_ERROR'),
      host as unknown as ArgumentsHost,
    );
    expect(_status).toHaveBeenCalledWith(HttpStatus.UNPROCESSABLE_ENTITY);
    expect(_send).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'UNKNOWN_DOMAIN_ERROR',
        data: null,
      }),
    );
  });

  it('includes the error code in the response body', () => {
    const { _send, _status, ...host } = buildHost();
    filter.catch(
      new DomainException('AUTH_INVALID_CREDENTIALS'),
      host as unknown as ArgumentsHost,
    );
    expect(_send).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'AUTH_INVALID_CREDENTIALS' }),
    );
  });

  it('logs a structured warning with the domain errorCode', () => {
    const { _send, _status, ...host } = buildHost();
    filter.catch(
      new DomainException('AUTH_ACCOUNT_LOCKED'),
      host as unknown as ArgumentsHost,
    );
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'AUTH_ACCOUNT_LOCKED' }),
      expect.any(String),
    );
  });
});
