import { createAuthMiddleware } from 'better-auth/api';
import type { EventEmitter2 } from '@nestjs/event-emitter';
import type Redis from 'ioredis';
import { AuthSignedOutEvent } from '@/auth/application/events/auth.events.js';

export function createSignOutAfterHook(deps: { redis: Redis; eventEmitter: EventEmitter2 }) {
  return createAuthMiddleware(async (ctx) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((ctx as any).path !== '/sign-out') return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const context = (ctx as any).context;
    const sessionId: string | undefined = context?.session?.id;
    const user = context?.user;

    // Remove session inactivity key from Redis
    if (sessionId) {
      await deps.redis.del(`session:${sessionId}:activity`);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const req = (ctx as any).request;
    const rawIp = req?.headers?.['x-forwarded-for'];
    const ip: string | undefined = Array.isArray(rawIp) ? rawIp[0] : rawIp ?? req?.ip;
    const rawCorrelation = req?.headers?.['x-correlation-id'];
    const correlationId: string | undefined = Array.isArray(rawCorrelation) ? rawCorrelation[0] : rawCorrelation;

    deps.eventEmitter.emit(
      'auth.signed_out',
      new AuthSignedOutEvent({
        userId: user?.id,
        email: user?.email,
        sessionId,
        ip,
        correlationId,
      }),
    );
  });
}
