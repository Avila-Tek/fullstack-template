import { describe, expect, it } from 'vitest';
import { makeZoomSignal } from './signal';

describe('makeZoomSignal()', () => {
  it('returns an AbortSignal', () => {
    const signal = makeZoomSignal(5000);
    expect(signal).toBeInstanceOf(AbortSignal);
  });

  it('is not already aborted', () => {
    const signal = makeZoomSignal(5000);
    expect(signal.aborted).toBe(false);
  });
});
