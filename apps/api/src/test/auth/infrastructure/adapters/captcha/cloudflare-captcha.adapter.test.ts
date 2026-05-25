import { describe, it, expect, vi } from 'vitest';
import { CloudflareCaptchaAdapter } from '@/auth/infrastructure/adapters/captcha/cloudflare-captcha.adapter.js';
import { env } from '@/env.js';

vi.mock('@/env.js', () => ({
  env: {
    CAPTCHA_ENABLED: true,
    CAPTCHA_SECRET_KEY: 'test-secret',
  },
}));

describe('CloudflareCaptchaAdapter', () => {
  it('returns success:true when CAPTCHA_ENABLED is false', async () => {
    vi.mocked(env).CAPTCHA_ENABLED = false;
    const adapter = new CloudflareCaptchaAdapter();
    const result = await adapter.verify('any-token');
    expect(result).toEqual({ success: true });
  });

  it('returns success:true when CAPTCHA_SECRET_KEY is not set', async () => {
    vi.mocked(env).CAPTCHA_ENABLED = true;
    (vi.mocked(env) as unknown as { CAPTCHA_SECRET_KEY: string | undefined }).CAPTCHA_SECRET_KEY = undefined;
    const adapter = new CloudflareCaptchaAdapter();
    const result = await adapter.verify('any-token');
    expect(result).toEqual({ success: true });
  });
});
