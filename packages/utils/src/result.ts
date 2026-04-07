/**
 * Discriminated union representing the outcome of a fallible operation.
 * Use when the error is a typed domain exception rather than a plain string.
 *
 * @template T - The success data type.
 * @template E - The failure error type (typically a domain exception).
 */
export type Result<T, E> =
  | { success: true; data: T }
  | { success: false; error: E };
