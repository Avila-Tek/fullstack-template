import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { PinoLogger } from 'nestjs-pino';

vi.mock('better-auth/api', () => ({
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
    path: '/sign-up/email',
    context: {
      user: { id: 'user-new', email: 'bob@example.com' },
    },
    request: { headers: {} },
    ...overrides,
  };
}

describe('createSignUpAfterHook — userId propagation', () => {
  let mockLogger: PinoLogger;

  beforeEach(() => {
    vi.clearAllMocks();
    mockLogger = buildMockLogger();
  });

  it('assigns userId to the logger context after successful sign-up', async () => {
    const { createSignUpAfterHook } = await import(
      '../../../../auth/infrastructure/hooks/sign-up.hooks.js'
    );

    const hook = createSignUpAfterHook({
      eventEmitter: { emit: vi.fn() } as never,
      logger: mockLogger,
    });

    await (hook as unknown as (ctx: unknown) => Promise<void>)(buildCtx());

    expect(mockLogger.assign).toHaveBeenCalledWith({ userId: 'user-new' });
  });

  it('does not call assign when context has no user', async () => {
    const { createSignUpAfterHook } = await import(
      '../../../../auth/infrastructure/hooks/sign-up.hooks.js'
    );

    const hook = createSignUpAfterHook({
      eventEmitter: { emit: vi.fn() } as never,
      logger: mockLogger,
    });

    await (hook as unknown as (ctx: unknown) => Promise<void>)(
      buildCtx({ context: { user: null } }),
    );

    expect(mockLogger.assign).not.toHaveBeenCalled();
  });
});
