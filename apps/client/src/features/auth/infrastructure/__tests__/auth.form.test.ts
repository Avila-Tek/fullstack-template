import { describe, expect, it } from '@jest/globals';
import {
  buildEmailCallbackSchema,
  buildForgotPasswordSchema,
  buildLoginSchema,
  buildOtpSchema,
  buildResetPasswordSchema,
  buildSignUpSchema,
} from '../auth.form';

const t = (key: string) => `translated:${key}`;

describe('buildLoginSchema', () => {
  it('requires email', () => {
    const schema = buildLoginSchema(t as never);
    const result = schema.safeParse({ email: '', password: 'validpass' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'translated:validation.emailRequired'
    );
  });

  it('requires valid email format', () => {
    const schema = buildLoginSchema(t as never);
    const result = schema.safeParse({
      email: 'notanemail',
      password: 'validpass',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'translated:validation.emailInvalid'
    );
  });

  it('requires password', () => {
    const schema = buildLoginSchema(t as never);
    const result = schema.safeParse({ email: 'a@b.com', password: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'translated:validation.passwordRequired'
    );
  });

  it('requires password min 8 chars', () => {
    const schema = buildLoginSchema(t as never);
    const result = schema.safeParse({ email: 'a@b.com', password: 'short' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'translated:validation.passwordMin'
    );
  });

  it('passes valid input', () => {
    const schema = buildLoginSchema(t as never);
    const result = schema.safeParse({
      email: 'a@b.com',
      password: 'validpass',
    });
    expect(result.success).toBe(true);
  });
});

describe('buildSignUpSchema', () => {
  const valid = {
    firstName: '',
    lastName: '',
    email: 'a@b.com',
    password: 'validpass',
    rePassword: 'validpass',
  };

  it('fails when passwords do not match', () => {
    const schema = buildSignUpSchema(t as never);
    const result = schema.safeParse({ ...valid, rePassword: 'different' });
    expect(result.success).toBe(false);
    const issue = result.error?.issues.find((i) =>
      i.path.includes('rePassword')
    );
    expect(issue?.message).toBe('translated:validation.passwordsMismatch');
  });

  it('passes valid input', () => {
    const schema = buildSignUpSchema(t as never);
    const result = schema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

describe('buildForgotPasswordSchema', () => {
  it('requires email', () => {
    const schema = buildForgotPasswordSchema(t as never);
    const result = schema.safeParse({ email: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'translated:validation.emailRequired'
    );
  });
});

describe('buildResetPasswordSchema', () => {
  const valid = {
    email: 'a@b.com',
    otp: '123456',
    newPassword: 'validpass',
    confirmPassword: 'validpass',
  };

  it('fails when passwords do not match', () => {
    const schema = buildResetPasswordSchema(t as never);
    const result = schema.safeParse({ ...valid, confirmPassword: 'different' });
    expect(result.success).toBe(false);
    const issue = result.error?.issues.find((i) =>
      i.path.includes('confirmPassword')
    );
    expect(issue?.message).toBe('translated:validation.passwordsMismatch');
  });

  it('passes valid input', () => {
    const schema = buildResetPasswordSchema(t as never);
    const result = schema.safeParse(valid);
    expect(result.success).toBe(true);
  });
});

describe('buildOtpSchema', () => {
  it('requires exactly 6 digits', () => {
    const schema = buildOtpSchema(t as never);
    const result = schema.safeParse({ otp: '123' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'translated:validation.otpDigits'
    );
  });
});

describe('buildEmailCallbackSchema', () => {
  it('requires tokenHash', () => {
    const schema = buildEmailCallbackSchema(t as never);
    const result = schema.safeParse({ tokenHash: '', type: 'verify' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'translated:validation.tokenRequired'
    );
  });

  it('requires type', () => {
    const schema = buildEmailCallbackSchema(t as never);
    const result = schema.safeParse({ tokenHash: 'abc', type: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'translated:validation.typeRequired'
    );
  });
});
