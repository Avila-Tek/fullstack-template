import { describe, expect, it } from 'vitest';
import { runWithConcurrency } from './concurrencyLimiter';

function deferred<T>(): {
  promise: Promise<T>;
  resolve: (v: T) => void;
  reject: (e: unknown) => void;
} {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('runWithConcurrency', () => {
  it('resolves to [] for an empty input array without invoking any task', async () => {
    let invocations = 0;
    const tasks: Array<() => Promise<number>> = [];
    const result = await runWithConcurrency(tasks, 3);
    expect(result).toEqual([]);
    expect(invocations).toBe(0);
  });

  it('throws synchronously when concurrency is 0', () => {
    expect(() => runWithConcurrency([async () => 1], 0)).toThrow();
  });

  it('throws synchronously when concurrency is negative', () => {
    expect(() => runWithConcurrency([async () => 1], -1)).toThrow();
  });

  it('preserves input order in results regardless of completion order', async () => {
    const delays = [50, 10, 30, 5, 40];
    const tasks = delays.map(
      (delay, index) => () =>
        new Promise<number>((resolve) =>
          setTimeout(() => resolve(index), delay)
        )
    );
    const results = await runWithConcurrency(tasks, 3);
    expect(results).toEqual([0, 1, 2, 3, 4]);
  });

  it('never exceeds the concurrency cap', async () => {
    const cap = 2;
    const total = 5;
    let inFlight = 0;
    let peak = 0;
    const tasks = Array.from({ length: total }, () => async () => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 10));
      inFlight -= 1;
      return inFlight;
    });
    await runWithConcurrency(tasks, cap);
    expect(peak).toBeLessThanOrEqual(cap);
    expect(peak).toBeGreaterThan(0);
  });

  it('surfaces the first error and rejects the overall promise', async () => {
    const tasks: Array<() => Promise<number>> = [
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 5));
        return 1;
      },
      async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        throw new Error('boom');
      },
      async () => 3,
    ];
    await expect(runWithConcurrency(tasks, 2)).rejects.toThrow('boom');
  });

  it('stops scheduling new tasks after an error', async () => {
    let scheduled = 0;
    const later = deferred<number>();
    const tasks: Array<() => Promise<number>> = [
      () => {
        scheduled += 1;
        return Promise.reject(new Error('fail-fast'));
      },
      () => {
        scheduled += 1;
        return later.promise;
      },
      () => {
        scheduled += 1;
        return Promise.resolve(3);
      },
    ];
    await expect(runWithConcurrency(tasks, 1)).rejects.toThrow('fail-fast');
    expect(scheduled).toBe(1);
    later.resolve(0);
  });
});
