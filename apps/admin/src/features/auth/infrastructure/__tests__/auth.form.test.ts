import { describe, expect, it } from '@jest/globals';
import {
  buildLoginSchema,
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
    const result = schema.safeParse({ email: 'notanemail', password: 'validpass' });
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

  it('passes valid input', () => {
    const schema = buildLoginSchema(t as never);
    const result = schema.safeParse({ email: 'a@b.com', password: 'validpass' });
    expect(result.success).toBe(true);
  });
});
