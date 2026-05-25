import { describe, it, expect, vi } from 'vitest';
import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { HttpExceptionFilter } from '../../../infrastructure/filters/http-exception.filter';

function buildHost(sendFn = vi.fn()) {
  const status = vi.fn().mockReturnValue({ send: sendFn });
  return {
    switchToHttp: () => ({ getResponse: () => ({ status }) }),
    _send: sendFn,
    _status: status,
  };
}

describe('HttpExceptionFilter', () => {
  const filter = new HttpExceptionFilter();

  it('returns 404 for NotFoundException', () => {
    const { _send, _status, ...host } = buildHost();
    filter.catch(new NotFoundException(), host as unknown as ArgumentsHost);
    expect(_status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(_send).toHaveBeenCalledWith(
      expect.objectContaining({ success: false, code: 404, data: null }),
    );
  });

  it('returns 401 for UnauthorizedException', () => {
    const { _send, _status, ...host } = buildHost();
    filter.catch(new UnauthorizedException(), host as unknown as ArgumentsHost);
    expect(_status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
  });

  it('includes string message', () => {
    const { _send, _status, ...host } = buildHost();
    filter.catch(
      new HttpException('Custom message', HttpStatus.BAD_REQUEST),
      host as unknown as ArgumentsHost,
    );
    expect(_send).toHaveBeenCalledWith(
      expect.objectContaining({ message: 'Custom message' }),
    );
  });

  it('includes error object error code when provided', () => {
    const { _send, _status, ...host } = buildHost();
    filter.catch(
      new HttpException({ error: 'AUTH_INVALID_CREDENTIALS', message: 'Bad creds' }, 401),
      host as unknown as ArgumentsHost,
    );
    expect(_send).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'AUTH_INVALID_CREDENTIALS' }),
    );
  });
});
