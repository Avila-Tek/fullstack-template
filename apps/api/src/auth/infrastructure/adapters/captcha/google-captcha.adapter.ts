import { Injectable } from '@nestjs/common';
import { CaptchaPort } from '@/auth/application/ports/out/captcha.port.js';
import { env } from '@/env.js';

const RECAPTCHA_URL = 'https://www.google.com/recaptcha/api/siteverify';
const SCORE_THRESHOLD = 0.5;

@Injectable()
export class GoogleCaptchaAdapter extends CaptchaPort {
  async verify(token: string, ip?: string): Promise<{ success: boolean }> {
    if (!env.CAPTCHA_ENABLED || !env.CAPTCHA_SECRET_KEY) {
      return { success: true };
    }

    const body = new URLSearchParams({
      secret: env.CAPTCHA_SECRET_KEY,
      response: token,
      ...(ip && { remoteip: ip }),
    });

    const res = await fetch(RECAPTCHA_URL, { method: 'POST', body });
    const data = (await res.json()) as { success: boolean; score?: number };
    const passed = data.success && (data.score === undefined || data.score >= SCORE_THRESHOLD);
    return { success: passed };
  }
}
