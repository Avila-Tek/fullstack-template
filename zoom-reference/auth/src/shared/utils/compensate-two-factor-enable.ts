import type { AuthHookContext } from '@thallesp/nestjs-better-auth';
import { setSessionCookie } from 'better-auth/cookies';

// GenericEndpointContext is from @better-auth/core and not re-exported by better-auth.
// Derive the parameter types from the function signature so TypeScript will catch
// any breaking changes in the BA upgrade path.
type SetSessionCookieCtx = Parameters<typeof setSessionCookie>[0];
type SetSessionCookieSession = Parameters<typeof setSessionCookie>[1];

/**
 * Reverts Better Auth's optimistic twoFactorEnabled=true write after a
 * failed enrollment UoW or missing pending-method key.
 * Pass session when available so the response cookie reflects the reverted state.
 * Omit session for TOTP enrollment — updateUser already refreshes Redis sessions.
 */
export async function compensateTwoFactorEnable(
	ctx: AuthHookContext,
	userId: string,
	session?: SetSessionCookieSession['session'],
): Promise<void> {
	const updatedUser = await ctx.context.internalAdapter.updateUser(userId, {
		twoFactorEnabled: false,
	});
	if (session) {
		// ctx is AuthHookContext (nestjs-better-auth wrapper); setSessionCookie
		// expects GenericEndpointContext (BA internal) — structurally identical but
		// not mutually assignable across packages without the double cast.
		await setSessionCookie(ctx as unknown as SetSessionCookieCtx, {
			session,
			user: updatedUser,
		});
	}
}
