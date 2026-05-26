import type { DomainException } from './domain-exception';

export type Result<T, E extends DomainException = DomainException> =
  | { success: true; data: T }
  | { success: false; error: E };
