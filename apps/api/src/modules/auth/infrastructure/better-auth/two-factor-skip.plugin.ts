import type { BetterAuthPlugin } from 'better-auth';
import { createAuthEndpoint, sessionMiddleware } from 'better-auth/api';

/**
 * Minimal Better Auth plugin that registers POST /two-factor/skip.
 *
 * The endpoint returns `{ message: '2FA skipped' }`. All audit logging is
 * handled by TwoFactorSkipHook via @AfterHook('/two-factor/skip'),
 * which keeps DI-dependent logic inside the NestJS provider layer.
 */
export const twoFactorSkip = (): BetterAuthPlugin => ({
	id: 'two-factor-skip',
	endpoints: {
		skipTwoFactor: createAuthEndpoint(
			'/two-factor/skip',
			{
				method: 'POST',
				use: [sessionMiddleware],
			},
			async (ctx) => {
				return ctx.json({
					message: '2FA skipped',
				});
			},
		),
	},
});
