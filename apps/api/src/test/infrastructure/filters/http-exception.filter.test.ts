import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { PinoLogger } from 'nestjs-pino';
import { HttpExceptionFilter } from '../../../infrastructure/filters/http-exception.filter.js';

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

describe('HttpExceptionFilter', () => {
  let mockLogger: PinoLogger;
  let filter: HttpExceptionFilter;

  beforeEach(() => {
    mockLogger = buildMockLogger();
    filter = new HttpExceptionFilter(mockLogger);
  });

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

  it('logs a structured error with errorCode for 5xx responses', () => {
    const { _send, _status, ...host } = buildHost();
    filter.catch(
      new HttpException('Server failed', HttpStatus.INTERNAL_SERVER_ERROR),
      host as unknown as ArgumentsHost,
    );
    expect(mockLogger.error).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: expect.any(String) }),
      expect.any(String),
    );
  });

  it('logs a structured warning with errorCode for 4xx responses', () => {
    const { _send, _status, ...host } = buildHost();
    filter.catch(new NotFoundException(), host as unknown as ArgumentsHost);
    expect(mockLogger.warn).toHaveBeenCalledWith(
      expect.objectContaining({ errorCode: 'NOT_FOUND' }),
      expect.any(String),
    );
  });
});
