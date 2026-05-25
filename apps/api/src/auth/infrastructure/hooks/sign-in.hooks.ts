// Stub — full implementation in Task 9
import { createAuthMiddleware } from 'better-auth/api';
import type { BruteForcePort } from '@/auth/application/ports/out/brute-force.port.js';
import type { EventEmitter2 } from '@nestjs/event-emitter';

export function createSignInBeforeHook(_deps: { bruteForce: BruteForcePort }) {
  return createAuthMiddleware(async (_ctx) => {});
}

export function createSignInAfterHook(_deps: { bruteForce: BruteForcePort; eventEmitter: EventEmitter2 }) {
  return createAuthMiddleware(async (_ctx) => {});
}
