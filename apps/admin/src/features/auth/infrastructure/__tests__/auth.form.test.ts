import { describe, expect, it } from '@jest/globals';
import { buildLoginSchema, type TAuthTranslations } from '../auth.form';

const t = (key: string): string => `translated:${key}`;
const mockT = t as unknown as TAuthTranslations;

describe('buildLoginSchema', () => {
  it('requires email', () => {
    const schema = buildLoginSchema(mockT);
    const result = schema.safeParse({ email: '', password: 'validpass1' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'translated:validation.emailRequired'
    );
  });

  it('requires valid email format', () => {
    const schema = buildLoginSchema(mockT);
    const result = schema.safeParse({
      email: 'notanemail',
      password: 'validpass1',
    });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'translated:validation.emailInvalid'
    );
  });

  it('requires password', () => {
    const schema = buildLoginSchema(mockT);
    const result = schema.safeParse({ email: 'a@b.com', password: '' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'translated:validation.passwordRequired'
    );
  });

  it('requires password min 8 chars', () => {
    const schema = buildLoginSchema(mockT);
    const result = schema.safeParse({ email: 'a@b.com', password: 'short' });
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe(
      'translated:validation.passwordMin'
    );
  });

  it('passes valid input', () => {
    const schema = buildLoginSchema(mockT);
    const result = schema.safeParse({
      email: 'a@b.com',
      password: 'validpass1',
    });
    expect(result.success).toBe(true);
  });
});
