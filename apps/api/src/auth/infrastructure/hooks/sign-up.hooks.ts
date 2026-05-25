import { createAuthMiddleware, APIError } from 'better-auth/api';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { CaptchaPort } from '@/auth/application/ports/out/captcha.port.js';
import { AuthSignedUpEvent } from '@/auth/application/events/auth.events.js';

export function createSignUpBeforeHook(deps: { captchaPort: CaptchaPort }) {
  return createAuthMiddleware(async (ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((ctx as any).path !== '/sign-up/email') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (ctx as any).body as Record<string, unknown> | undefined;
    const captchaToken = body?.captchaToken as string | undefined;
    if (!captchaToken) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = (ctx as any).request;
    const rawIp = req?.headers?.['x-forwarded-for'];
    const ip: string | undefined = Array.isArray(rawIp) ? rawIp[0] : rawIp ?? req?.ip;

    const result = await deps.captchaPort.verify(captchaToken, ip);
    if (!result.success) {
      throw new APIError('FORBIDDEN', { message: 'Captcha verification failed' });
    }
  });
}

export function createSignUpAfterHook(deps: { eventEmitter: EventEmitter2 }) {
  return createAuthMiddleware(async (ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((ctx as any).path !== '/sign-up/email') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const context = (ctx as any).context;
    const user = context?.user;
    if (!user) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = (ctx as any).request;
    const rawIp = req?.headers?.['x-forwarded-for'];
    const ip: string | undefined = Array.isArray(rawIp) ? rawIp[0] : rawIp ?? req?.ip;
    const rawCorrelation = req?.headers?.['x-correlation-id'];
    const correlationId: string | undefined = Array.isArray(rawCorrelation) ? rawCorrelation[0] : rawCorrelation;

    deps.eventEmitter.emit(
      'auth.signed_up',
      new AuthSignedUpEvent({
        userId: user.id,
        email: user.email,
        ip,
        correlationId,
      }),
    );
  });
}
