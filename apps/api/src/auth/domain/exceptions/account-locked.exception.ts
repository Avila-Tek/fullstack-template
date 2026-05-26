import { DomainException } from '../../../shared/domain-exception.js';

export class AccountLockedException extends DomainException {
  constructor(meta?: Record<string, unknown>) {
    super('AUTH_ACCOUNT_LOCKED', meta);
  }
}
