import { describe, it, expect } from 'vitest';
import { AccountLockedException } from '../../../../auth/domain/exceptions/account-locked.exception.js';
import { EmailDeliveryFailedException } from '../../../../auth/domain/exceptions/email-delivery-failed.exception.js';
import { PasswordPolicyFailedException } from '../../../../auth/domain/exceptions/password-policy-failed.exception.js';
import { PasswordReuseException } from '../../../../auth/domain/exceptions/password-reuse.exception.js';
import { DomainException } from '../../../../shared/domain-exception.js';

describe('Auth domain exceptions', () => {
  it('AccountLockedException has correct error code', () => {
    const ex = new AccountLockedException();
    expect(ex.error).toBe('AUTH_ACCOUNT_LOCKED');
    expect(ex).toBeInstanceOf(DomainException);
  });

  it('EmailDeliveryFailedException has correct error code', () => {
    const ex = new EmailDeliveryFailedException();
    expect(ex.error).toBe('AUTH_EMAIL_DELIVERY_FAILED');
    expect(ex).toBeInstanceOf(DomainException);
  });

  it('PasswordPolicyFailedException carries violations array', () => {
    const ex = new PasswordPolicyFailedException(['Too short', 'No digit']);
    expect(ex.error).toBe('AUTH_PASSWORD_POLICY_FAILED');
    expect(ex.meta).toEqual({ violations: ['Too short', 'No digit'] });
  });

  it('PasswordReuseException has correct error code', () => {
    const ex = new PasswordReuseException();
    expect(ex.error).toBe('AUTH_PASSWORD_REUSE');
  });
});
