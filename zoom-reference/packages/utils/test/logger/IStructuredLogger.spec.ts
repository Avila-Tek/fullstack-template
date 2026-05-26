import { describe, expect, it, vi } from 'vitest';
import { type IStructuredLogger, LOGGER_PORT } from '../../src/index';

describe('IStructuredLogger', () => {
  it('LOGGER_PORT is the string literal "LOGGER_PORT"', () => {
    expect(LOGGER_PORT).toBe('LOGGER_PORT');
  });

  it('a mock object satisfying IStructuredLogger compiles and can be called', () => {
    const logger: IStructuredLogger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    logger.info({ event: 'test' }, 'info message');
    logger.warn({ event: 'test' }, 'warn message');
    logger.error({ event: 'test' }, 'error message');
    logger.debug({ event: 'test' });

    expect(logger.info).toHaveBeenCalledWith({ event: 'test' }, 'info message');
    expect(logger.warn).toHaveBeenCalledWith({ event: 'test' }, 'warn message');
    expect(logger.error).toHaveBeenCalledWith(
      { event: 'test' },
      'error message'
    );
    expect(logger.debug).toHaveBeenCalledWith({ event: 'test' });
  });
});
