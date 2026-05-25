import { DomainException } from '@shared/domain-exception.js';

export class PasswordPolicyFailedException extends DomainException {
  constructor(violations: string[]) {
    super('AUTH_PASSWORD_POLICY_FAILED', { violations });
  }
}
