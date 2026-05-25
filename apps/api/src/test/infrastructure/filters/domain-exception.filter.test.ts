import { describe, it, expect, vi } from 'vitest';
import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { DomainExceptionFilter } from '../../../infrastructure/filters/domain-exception.filter';
import { DomainException } from '../../../shared/domain-exception';

function buildHost(sendFn = vi.fn()) {
  const status = vi.fn().mockReturnValue({ send: sendFn });
  return {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
    _send: sendFn,
    _status: status,
  };
}

describe('DomainExceptionFilter', () => {
  const filter = new DomainExceptionFilter();

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
});
