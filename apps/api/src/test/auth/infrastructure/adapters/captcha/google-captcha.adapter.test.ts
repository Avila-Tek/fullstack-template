import { describe, it, expect, vi } from 'vitest';
import { GoogleCaptchaAdapter } from '@/auth/infrastructure/adapters/captcha/google-captcha.adapter.js';
import { env } from '@/env.js';

vi.mock('@/env.js', () => ({
  env: {
    CAPTCHA_ENABLED: false,
    CAPTCHA_SECRET_KEY: undefined,
  },
}));

describe('GoogleCaptchaAdapter', () => {
  it('returns success:true when CAPTCHA_ENABLED is false', async () => {
    const adapter = new GoogleCaptchaAdapter();
    const result = await adapter.verify('any-token');
    expect(result).toEqual({ success: true });
  });
});
