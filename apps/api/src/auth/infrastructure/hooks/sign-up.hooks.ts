import { createAuthMiddleware, APIError } from 'better-auth/api';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { PinoLogger } from 'nestjs-pino';
import type { CaptchaPort } from '../../application/ports/out/captcha.port.js';
import { AuthSignedUpEvent } from '../../application/events/auth.events.js';
import { user } from '../persistence/auth.schema.js';

export function createSignUpBeforeHook(deps: { captchaPort: CaptchaPort; db: NodePgDatabase }) {
  return createAuthMiddleware(async (ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((ctx as any).path !== '/sign-up/email') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (ctx as any).body as Record<string, unknown> | undefined;

    // Reject if the email is already taken (verified OR unverified).
    // BA with requireEmailVerification allows re-registration for unverified accounts
    // by design (to resend the verification email); we disable that behaviour here.
    const email = body?.email as string | undefined;
    if (email) {
      const normalized = email.toLowerCase().trim();
      const existing = await deps.db
        .select({ id: user.id })
        .from(user)
        .where(eq(user.normalizedEmail, normalized))
        .limit(1);
      if (existing.length > 0) {
        throw new APIError('UNPROCESSABLE_ENTITY', {
          message: 'User already exists',
          code: 'USER_ALREADY_EXISTS',
        } as never);
      }
    }

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

export function createSignUpAfterHook(deps: { eventEmitter: EventEmitter2; logger: PinoLogger }) {
  return createAuthMiddleware(async (ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((ctx as any).path !== '/sign-up/email') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const context = (ctx as any).context;
    const newUser = context?.user;
    if (!newUser) return;

    // Schema standard: attach userId to the request log context for all subsequent logs
    deps.logger.assign({ userId: newUser.id });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = (ctx as any).request;
    const rawIp = req?.headers?.['x-forwarded-for'];
    const ip: string | undefined = Array.isArray(rawIp) ? rawIp[0] : rawIp ?? req?.ip;
    const rawCorrelation = req?.headers?.['x-correlation-id'];
    const correlationId: string | undefined = Array.isArray(rawCorrelation) ? rawCorrelation[0] : rawCorrelation;

    deps.eventEmitter.emit(
      'auth.signed_up',
      new AuthSignedUpEvent({
        userId: newUser.id,
        email: newUser.email,
        ip,
        correlationId,
      }),
    );
  });
}
