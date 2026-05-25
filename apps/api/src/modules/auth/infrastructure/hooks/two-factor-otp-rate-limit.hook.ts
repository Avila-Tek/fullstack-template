import { Inject, Injectable } from '@nestjs/common';
import {
	type AuthHookContext,
	BeforeHook,
	Hook,
} from '@thallesp/nestjs-better-auth';
import { APIError } from 'better-auth';
import type Redis from 'ioredis';
import { env } from '../../env';
import { recordAuthEvent } from '../../shared/metrics/auth-metrics';
import { auth } from '../better-auth/auth';
import { REDIS_CLIENT } from '../redis/redis.constants';

// NOTE: Better Auth's built-in rateLimit (customRules) keys by IP address.
// OTP sends must be limited per-user instead — an attacker with rotating IPs
// could otherwise trigger unlimited SMS charges against a single target account.
@Hook()
@Injectable()
export class TwoFactorOtpRateLimitHook {
	constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

	@BeforeHook('/two-factor/send-otp')
	async before(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		const session = await auth.api.getSession({ headers: ctx.request.headers });

		let userId: string | undefined;

		if (session) {
			// Enrollment path: active session present
			userId = session.user.id;
		} else {
			// Challenge path: no session cookie — resolve user from the 2FA cookie
			const cookieName = ctx.context.createAuthCookie('two_factor').name;
			const cookieValue = await ctx.getSignedCookie(
				cookieName,
				ctx.context.secret,
			);
			if (cookieValue) {
				const token =
					await ctx.context.internalAdapter.findVerificationValue(cookieValue);
				if (token) userId = token.value;
			}
		}

		if (!userId) return;

		const key = `2fa_otp_send:${userId}`;

		// Pipeline: INCR + EXPIRE NX in one round-trip (fixed window).
		// EXPIRE NX only sets the TTL when the key has no existing expiry, so the
		// window is anchored to the first send and subsequent calls within the window
		// leave the TTL untouched.
		const results = await this.redis
			.pipeline()
			.incr(key)
			.expire(key, env.OTP_WINDOW_SECONDS, 'NX')
			.exec();

		const count = (results?.[0]?.[1] as number) ?? 0;

		if (count > env.OTP_MAX_SENDS) {
			recordAuthEvent('2fa_otp_send_rate_limited');
			throw new APIError(429, { code: 'AUTH_2FA_OTP_RATE_LIMITED' });
		}
	}
}
