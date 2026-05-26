import { createAuthMiddleware, APIError } from 'better-auth/api';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type { PinoLogger } from 'nestjs-pino';
import type { BruteForcePort } from '../../application/ports/out/brute-force.port.js';
import { AuthSignedInEvent } from '../../application/events/auth.events.js';
import { env } from '../../../env.js';

export function createSignInBeforeHook(deps: { bruteForce: BruteForcePort }) {
  return createAuthMiddleware(async (ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((ctx as any).path !== '/sign-in/email') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const body = (ctx as any).body as Record<string, unknown> | undefined;
    const email = body?.email as string | undefined;
    if (!email) return;

    const count = await deps.bruteForce.increment(email);
    if (count > env.BRUTE_FORCE_MAX_ATTEMPTS) {
      throw new APIError('TOO_MANY_REQUESTS', {
        message: 'Too many failed attempts. Account temporarily locked.',
        body: { code: 'AUTH_ACCOUNT_LOCKED' },
      });
    }
  });
}

export function createSignInAfterHook(deps: {
  bruteForce: BruteForcePort;
  eventEmitter: EventEmitter2;
  logger: PinoLogger;
}) {
  return createAuthMiddleware(async (ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((ctx as any).path !== '/sign-in/email') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const context = (ctx as any).context;
    const user = context?.user;
    if (!user?.email) return;

    // Schema standard: attach userId to the request log context for all subsequent logs
    deps.logger.assign({ userId: user.id });

    // Reset brute force counter on successful login
    await deps.bruteForce.clear(user.email);

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = (ctx as any).request;
    const rawIp = req?.headers?.['x-forwarded-for'];
    const ip: string | undefined = Array.isArray(rawIp) ? rawIp[0] : rawIp ?? req?.ip;
    const rawCorrelation = req?.headers?.['x-correlation-id'];
    const correlationId: string | undefined = Array.isArray(rawCorrelation) ? rawCorrelation[0] : rawCorrelation;

    deps.eventEmitter.emit(
      'auth.signed_in',
      new AuthSignedInEvent({
        userId: user.id,
        email: user.email,
        sessionId: context?.session?.id,
        ip,
        correlationId,
      }),
    );
  });
}
