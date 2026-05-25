import { Injectable } from '@nestjs/common';
import { CaptchaPort } from '@/auth/application/ports/out/captcha.port.js';
import { env } from '@/env.js';

const TURNSTILE_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

@Injectable()
export class CloudflareCaptchaAdapter extends CaptchaPort {
  async verify(token: string, ip?: string): Promise<{ success: boolean }> {
    if (!env.CAPTCHA_ENABLED || !env.CAPTCHA_SECRET_KEY) {
      return { success: true };
    }

    const body = new URLSearchParams({
      secret: env.CAPTCHA_SECRET_KEY,
      response: token,
      ...(ip && { remoteip: ip }),
    });

    const res = await fetch(TURNSTILE_URL, { method: 'POST', body });
    const data = (await res.json()) as { success: boolean };
    return { success: data.success };
  }
}
