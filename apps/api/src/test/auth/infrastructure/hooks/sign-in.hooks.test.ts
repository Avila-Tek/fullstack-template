import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PinoLogger } from 'nestjs-pino';

// Mock better-auth/api so createAuthMiddleware is transparent in tests
vi.mock('better-auth/api', () => ({
  // Return the inner function directly so we can call it without the middleware wrapper
  createAuthMiddleware: vi.fn((fn: (ctx: unknown) => Promise<void>) => fn),
  APIError: class APIError extends Error {
    constructor(code: string, options?: { message?: string }) {
      super(options?.message ?? code);
      this.name = code;
    }
  },
}));

function buildMockLogger() {
  return {
    assign: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  } as unknown as PinoLogger;
}

function buildCtx(overrides: Record<string, unknown> = {}) {
  return {
    path: '/sign-in/email',
    context: {
      user: { id: 'user-abc', email: 'alice@example.com' },
      session: { id: 'sess-xyz' },
    },
    request: { headers: {} },
    ...overrides,
  };
}

describe('createSignInAfterHook — userId propagation', () => {
  let mockLogger: PinoLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = buildMockLogger();
  });

  it('assigns userId to the logger context after successful sign-in', async () => {
    const { createSignInAfterHook } = await import(
      '../../../../auth/infrastructure/hooks/sign-in.hooks.js'
    );

    const hook = createSignInAfterHook({
      bruteForce: { clear: vi.fn(), increment: vi.fn() } as never,
      eventEmitter: { emit: vi.fn() } as never,
      logger: mockLogger,
    });

    await (hook as unknown as (ctx: unknown) => Promise<void>)(buildCtx());

    expect(mockLogger.assign).toHaveBeenCalledWith({ userId: 'user-abc' });
  });

  it('does not call assign when context has no user (unauthenticated)', async () => {
    const { createSignInAfterHook } = await import(
      '../../../../auth/infrastructure/hooks/sign-in.hooks.js'
    );

    const hook = createSignInAfterHook({
      bruteForce: { clear: vi.fn(), increment: vi.fn() } as never,
      eventEmitter: { emit: vi.fn() } as never,
      logger: mockLogger,
    });

    await (hook as unknown as (ctx: unknown) => Promise<void>)(
      buildCtx({ context: { user: null } }),
    );

    expect(mockLogger.assign).not.toHaveBeenCalled();
  });

  it('does not call assign for non-sign-in paths', async () => {
    const { createSignInAfterHook } = await import(
      '../../../../auth/infrastructure/hooks/sign-in.hooks.js'
    );

    const hook = createSignInAfterHook({
      bruteForce: { clear: vi.fn(), increment: vi.fn() } as never,
      eventEmitter: { emit: vi.fn() } as never,
      logger: mockLogger,
    });

    await (hook as unknown as (ctx: unknown) => Promise<void>)(
      buildCtx({ path: '/other/path' }),
    );

    expect(mockLogger.assign).not.toHaveBeenCalled();
  });
});
