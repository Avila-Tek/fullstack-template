import type { BetterAuthPlugin } from 'better-auth';
import { createAuthMiddleware } from 'better-auth/api';
import { and, eq } from 'drizzle-orm';
import type { AuthDb } from '../database/drizzle.module';
import { userTwoFactor } from '../database/schema/user-two-factor.schema';

/**
 * Registered after twoFactor() so this plugin hook runs after BA has already
 * set twoFactorMethods on the sign-in response. Replaces the full methods
 * array with a single-element array containing the user's active method.
 */
export const twoFactorFilter = (db: AuthDb): BetterAuthPlugin => ({
	id: 'two-factor-filter',
	hooks: {
		after: [
			{
				matcher: (ctx) =>
					ctx.path === '/sign-in/email' ||
					ctx.path?.startsWith('/callback/') === true,
				handler: createAuthMiddleware(async (ctx) => {
					const returned = ctx.context.returned as
						| Record<string, unknown>
						| undefined;
					if (returned?.twoFactorRedirect !== true) return;

					const session = ctx.context.newSession as
						| { user: { id: string } }
						| undefined;
					const userId = session?.user?.id;
					if (!userId) return;

					try {
						const [record] = await db
							.select({ method: userTwoFactor.method })
							.from(userTwoFactor)
							.where(
								and(
									eq(userTwoFactor.userId, userId),
									eq(userTwoFactor.enabled, true),
								),
							)
							.limit(1);

						if (!record) return;

						returned.twoFactorMethods = [
							record.method === 'totp' ? 'totp' : 'otp',
						];
					} catch {
						// If query fails, leave twoFactorMethods unchanged so sign-in continues
						// with full methods array as fallback
						return;
					}
				}),
			},
		],
	},
});
