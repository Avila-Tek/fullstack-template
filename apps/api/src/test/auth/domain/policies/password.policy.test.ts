import { describe, it, expect } from 'vitest';
import { PasswordPolicy } from '@/auth/domain/policies/password.policy.js';
import { PasswordPolicyFailedException } from '@/auth/domain/exceptions/password-policy-failed.exception.js';

describe('PasswordPolicy.validate', () => {
  it('accepts a valid complex password', () => {
    expect(() => PasswordPolicy.validate('Str0ng!Pass')).not.toThrow();
  });

  it('rejects password shorter than 8 chars', () => {
    expect(() => PasswordPolicy.validate('Ab1!')).toThrow(PasswordPolicyFailedException);
  });

  it('rejects password longer than 128 chars', () => {
    expect(() => PasswordPolicy.validate(`A1!${'a'.repeat(130)}`)).toThrow(PasswordPolicyFailedException);
  });

  it('rejects password with no uppercase', () => {
    expect(() => PasswordPolicy.validate('str0ng!pass')).toThrow(PasswordPolicyFailedException);
  });

  it('rejects password with no lowercase', () => {
    expect(() => PasswordPolicy.validate('STR0NG!PASS')).toThrow(PasswordPolicyFailedException);
  });

  it('rejects password with no digit', () => {
    expect(() => PasswordPolicy.validate('Stro!ngPass')).toThrow(PasswordPolicyFailedException);
  });

  it('rejects password with no special character', () => {
    expect(() => PasswordPolicy.validate('Str0ngPass1')).toThrow(PasswordPolicyFailedException);
  });

  it('rejects password with leading space', () => {
    expect(() => PasswordPolicy.validate(' Str0ng!Pass')).toThrow(PasswordPolicyFailedException);
  });

  it('rejects password with trailing space', () => {
    expect(() => PasswordPolicy.validate('Str0ng!Pass ')).toThrow(PasswordPolicyFailedException);
  });

  it('accumulates all violations', () => {
    try {
      PasswordPolicy.validate('short');
      expect.fail('should throw');
    } catch (e) {
      expect(e).toBeInstanceOf(PasswordPolicyFailedException);
      const ex = e as PasswordPolicyFailedException;
      const violations = (ex.meta as { violations: string[] }).violations;
      expect(violations.length).toBeGreaterThan(1);
    }
  });
});
