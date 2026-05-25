// Stub — full implementation in Task 9
import { createAuthMiddleware } from 'better-auth/api';
import type { CaptchaPort } from '@/auth/application/ports/out/captcha.port.js';
import type { EventEmitter2 } from '@nestjs/event-emitter';

export function createSignUpBeforeHook(_deps: { captchaPort: CaptchaPort }) {
  return createAuthMiddleware(async (_ctx) => {});
}

export function createSignUpAfterHook(_deps: { eventEmitter: EventEmitter2 }) {
  return createAuthMiddleware(async (_ctx) => {});
}
