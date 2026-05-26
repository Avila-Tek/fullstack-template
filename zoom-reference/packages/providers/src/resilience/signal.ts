/**
 * Returns an AbortSignal that times out after the given number of milliseconds.
 * When the signal fires, fetch throws a DOMException with name 'TimeoutError',
 * which adapters map to a network_error reason.
 */
export function makeZoomSignal(timeoutMs: number): AbortSignal {
  if (!Number.isFinite(timeoutMs) || timeoutMs < 0) {
    throw new RangeError(
      `Invalid timeout: timeoutMs must be a finite non-negative number, got ${timeoutMs}`
    );
  }
  return AbortSignal.timeout(timeoutMs);
}
