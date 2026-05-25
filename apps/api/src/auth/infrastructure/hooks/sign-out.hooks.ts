// Stub — full implementation in Task 9
import { createAuthMiddleware } from 'better-auth/api';
import type Redis from 'ioredis';
import type { EventEmitter2 } from '@nestjs/event-emitter';

export function createSignOutAfterHook(_deps: { redis: Redis; eventEmitter: EventEmitter2 }) {
  return createAuthMiddleware(async (_ctx) => {});
}
