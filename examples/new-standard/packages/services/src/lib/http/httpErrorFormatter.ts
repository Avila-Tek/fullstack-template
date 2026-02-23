/**
 * Common error field names used by APIs that don't follow our envelope format.
 * Ordered by priority (most common first).
 */
const ERROR_FIELD_NAMES = ['message', 'error', 'errorMessage', 'msg'] as const;

/**
 * Attempts to extract an error message from a raw API response that doesn't
 * follow the standard envelope format.
 *
 * Checks common error field patterns used by various APIs/frameworks.
 */
export function extractErrorFromRawResponse(data: unknown): string | undefined {
  if (typeof data === 'string') {
    return data;
  }

  if (data && typeof data === 'object') {
    for (const field of ERROR_FIELD_NAMES) {
      const value = (data as Record<string, unknown>)[field];
      if (typeof value === 'string' && value.length > 0) {
        return value;
      }
    }
  }

  return undefined;
}
