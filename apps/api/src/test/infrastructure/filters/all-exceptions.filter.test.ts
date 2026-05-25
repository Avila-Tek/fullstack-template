import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArgumentsHost, HttpStatus } from '@nestjs/common';
import { AllExceptionsFilter } from '../../../infrastructure/filters/all-exceptions.filter';

vi.mock('@sentry/nestjs', () => ({
  captureException: vi.fn(),
}));

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  it('responds with 500 INTERNAL_ERROR for any exception', () => {
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    filter.catch(new Error('Unexpected'), host);

    expect(status).toHaveBeenCalledWith(HttpStatus.INTERNAL_SERVER_ERROR);
    expect(send).toHaveBeenCalledWith(
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
    const send = vi.fn();
    const status = vi.fn().mockReturnValue({ send });
    const host = {
      switchToHttp: () => ({ getResponse: () => ({ status }) }),
    } as unknown as ArgumentsHost;

    const err = new Error('boom');
    filter.catch(err, host);

    expect(Sentry.captureException).toHaveBeenCalledWith(err);
  });
});
