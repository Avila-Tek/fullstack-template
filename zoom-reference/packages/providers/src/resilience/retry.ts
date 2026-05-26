export interface RetryConfig {
  readonly maxAttempts: number;
  readonly backoffMs: number;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retries fn with exponential backoff whenever isTransient(err) returns true.
 * Non-transient errors are rethrown immediately without retrying.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  isTransient: (err: unknown) => boolean,
  config: RetryConfig
): Promise<T> {
  if (!Number.isInteger(config.maxAttempts) || config.maxAttempts <= 0) {
    throw new RangeError(
      `Invalid retry config: maxAttempts must be a positive integer, got ${config.maxAttempts}`
    );
  }

  let lastError: unknown;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (!isTransient(err) || attempt === config.maxAttempts) {
        throw err;
      }
      lastError = err;
      await sleep(config.backoffMs * 2 ** (attempt - 1));
    }
  }

  // Unreachable: loop above always throws on the last attempt.
  throw lastError;
}
