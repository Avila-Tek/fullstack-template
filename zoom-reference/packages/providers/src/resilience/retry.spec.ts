import { describe, expect, it, vi } from 'vitest';
import { withRetry } from './retry';

class TransientError extends Error {
  readonly transient = true;
}
class FatalError extends Error {
  readonly transient = false;
}

const isTransient = (err: unknown) =>
  err instanceof TransientError && err.transient;
const CONFIG = { maxAttempts: 3, backoffMs: 0 };

describe('withRetry()', () => {
  describe('when fn succeeds on first attempt', () => {
    it('resolves with the return value', async () => {
      const result = await withRetry(
        () => Promise.resolve(42),
        isTransient,
        CONFIG
      );
      expect(result).toBe(42);
    });

    it('calls fn exactly once', async () => {
      const fn = vi.fn().mockResolvedValue('ok');
      await withRetry(fn, isTransient, CONFIG);
      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe('when fn throws a transient error then succeeds', () => {
    it('retries and resolves on success', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new TransientError('network'))
        .mockResolvedValue('recovered');
      const result = await withRetry(fn, isTransient, CONFIG);
      expect(result).toBe('recovered');
      expect(fn).toHaveBeenCalledTimes(2);
    });

    it('retries up to maxAttempts times', async () => {
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new TransientError('t1'))
        .mockRejectedValueOnce(new TransientError('t2'))
        .mockResolvedValue('done');
      await withRetry(fn, isTransient, CONFIG);
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('when fn throws a non-transient error', () => {
    it('does NOT retry and rethrows immediately', async () => {
      const fn = vi.fn().mockRejectedValue(new FatalError('fatal'));
      await expect(withRetry(fn, isTransient, CONFIG)).rejects.toBeInstanceOf(
        FatalError
      );
      expect(fn).toHaveBeenCalledOnce();
    });
  });

  describe('when fn exceeds maxAttempts with transient errors', () => {
    it('rethrows the last transient error after exhausting retries', async () => {
      const lastErr = new TransientError('last');
      const fn = vi
        .fn()
        .mockRejectedValueOnce(new TransientError('first'))
        .mockRejectedValueOnce(new TransientError('second'))
        .mockRejectedValue(lastErr);
      await expect(withRetry(fn, isTransient, CONFIG)).rejects.toBe(lastErr);
      expect(fn).toHaveBeenCalledTimes(3);
    });
  });

  describe('custom config', () => {
    it('respects maxAttempts override', async () => {
      const fn = vi.fn().mockRejectedValue(new TransientError('always fails'));
      await expect(
        withRetry(fn, isTransient, { maxAttempts: 1, backoffMs: 0 })
      ).rejects.toThrow();
      expect(fn).toHaveBeenCalledOnce();
    });
  });
});
