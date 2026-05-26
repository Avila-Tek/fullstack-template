/**
 * Lazy loader for the ESM-only better-auth package.
 *
 * better-auth ships as pure ESM ("type": "module", only .mjs exports).
 * This API compiles to CommonJS, so static `import` statements compile to
 * `require()` and crash at runtime with ERR_REQUIRE_ESM on Node ≤ 21.
 *
 * Dynamic `import()` works from any CJS module and resolves ESM packages
 * correctly. This module is the single point of entry for all better-auth
 * runtime imports — no other file may statically import from better-auth.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export interface BetterAuthModules {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  betterAuth: (options: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createAuthMiddleware: (fn: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  APIError: new (code: string, options?: any) => Error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  drizzleAdapter: (db: any, options: any) => any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  toNodeHandler: (auth: any) => (req: unknown, res: unknown) => unknown;
}

let _cache: BetterAuthModules | null = null;

export async function loadBetterAuth(): Promise<BetterAuthModules> {
  if (_cache) return _cache;

  const [main, api, drizzle, node] = await Promise.all([
    import('better-auth'),
    import('better-auth/api'),
    import('better-auth/adapters/drizzle'),
    import('better-auth/node'),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  _cache = {
    betterAuth: (main as any).betterAuth,
    createAuthMiddleware: (api as any).createAuthMiddleware,
    APIError: (api as any).APIError,
    drizzleAdapter: (drizzle as any).drizzleAdapter,
    toNodeHandler: (node as any).toNodeHandler,
  };

  return _cache;
}
