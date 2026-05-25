import { DomainException } from '@shared/domain-exception.js';

export class PasswordReuseException extends DomainException {
  constructor(meta?: Record<string, unknown>) {
    super('AUTH_PASSWORD_REUSE', meta);
  }
}
