import { Inject, Injectable } from '@nestjs/common';
import type { AuthHookContext } from '@thallesp/nestjs-better-auth';
import { AfterHook, Hook } from '@thallesp/nestjs-better-auth';
import { getOAuthState } from 'better-auth/api';
import { DeviceRepositoryPort } from '../../application/ports/out/device-repository.port';
import { EmailServicePort } from '../../application/ports/out/email-service.port';
import { SystemAuditLogPort } from '../../application/ports/out/system-audit-log.port';
import { UserRepositoryPort } from '../../application/ports/out/user-repository.port';
import { env } from '../../env';
import { auditLogger } from '../../shared/logger/audit-logger';
import { generateRecoveryToken } from '../../shared/utils/generate-recovery-token';
import {
	parseDeviceName,
	parseDeviceType,
} from '../../shared/utils/parse-device-name';
import { resolveClientIp } from '../../shared/utils/resolve-client-ip';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEVICE_COOKIE_NAME = 'zoom_device_id';
const DEVICE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

// ---------------------------------------------------------------------------
// Types — read from ctx.context, injected by earlier hooks in the chain
// ---------------------------------------------------------------------------

interface SystemResolutionCtx {
	systemId: string;
}

// ---------------------------------------------------------------------------
// DeviceHook
//
// Registered BEFORE SignInHook and SocialCallbackHook so that
// ctx.context.deviceId is available to their @AfterHook handlers for
// inclusion in the audit log.
//
// Handles two routes:
//   /sign-in/email      — reads systemResolution + correlationId from SignInHook.before
//   /callback/:provider — reads systemResolution from SocialCallbackHook.before;
//                         correlationId from getOAuthState()
// ---------------------------------------------------------------------------

@Hook()
@Injectable()
export class DeviceHook {
	constructor(
		@Inject(DeviceRepositoryPort)
		private readonly deviceRepository: DeviceRepositoryPort,
		@Inject(SystemAuditLogPort)
		private readonly systemAuditLog: SystemAuditLogPort,
		@Inject(EmailServicePort)
		private readonly emailService: EmailServicePort,
		@Inject(UserRepositoryPort)
		private readonly userRepository: UserRepositoryPort,
	) {}

	@AfterHook('/sign-in/email')
	async afterSignIn(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		const returned = ctx.context.returned as
			| { user?: { id?: string } }
			| undefined;
		const userId =
			typeof returned?.user?.id === 'string' ? returned.user.id : undefined;
		if (!userId) return;

		const systemResolution = ctx.context.systemResolution as
			| SystemResolutionCtx
			| undefined;
		if (!systemResolution) return;

		await this.handleDevice(ctx, {
			userId,
			userAgent: ctx.getHeader('user-agent') ?? '',
			ip: resolveClientIp(ctx),
			correlationId: ctx.context.correlationId as string | undefined,
			systemId: systemResolution.systemId,
		});
	}

	@AfterHook('/callback/:provider')
	async afterCallback(ctx: AuthHookContext): Promise<void> {
		if (!ctx.request) return;

		const systemResolution = ctx.context.systemResolution as
			| SystemResolutionCtx
			| undefined;
		if (!systemResolution) return;

		const newSession = ctx.context.newSession as
			| { user?: { id?: string } }
			| undefined;
		const userId =
			typeof newSession?.user?.id === 'string' ? newSession.user.id : undefined;
		if (!userId) return;

		const state = await getOAuthState();
		const correlationId =
			typeof state?.correlationId === 'string'
				? state.correlationId
				: undefined;

		await this.handleDevice(ctx, {
			userId,
			userAgent: ctx.getHeader('user-agent') ?? '',
			ip: resolveClientIp(ctx),
			correlationId,
			systemId: systemResolution.systemId,
		});
	}

	// ── Private helpers ─────────────────────────────────────────────────────────

	private async handleDevice(
		ctx: AuthHookContext,
		data: {
			userId: string;
			userAgent: string;
			ip: string;
			correlationId: string | undefined;
			systemId: string;
		},
	): Promise<void> {
		const { userId, userAgent, ip, correlationId, systemId } = data;

		// ── Step 1: cookie-based lookup (primary fingerprint) ──────────────────
		// zoom_device_id is an httpOnly cookie carrying device.id (a server-generated
		// UUID). It survives browser UA changes, so returning users are not flagged
		// as new devices on every minor browser version bump.
		// findByIdAndUser scopes by userId, so a cookie from a different user's
		// session returns null and falls through safely.
		const cookieDeviceId = ctx.getCookie(DEVICE_COOKIE_NAME);
		if (cookieDeviceId) {
			const touched = await this.deviceRepository
				.touchDevice({
					id: cookieDeviceId,
					userId,
					userAgent,
					deviceName: parseDeviceName(userAgent),
					deviceType: parseDeviceType(userAgent),
					ipAddress: ip,
				})
				.catch(() => null);
			if (touched) {
				ctx.context.deviceId = touched.id;
				ctx.setCookie(DEVICE_COOKIE_NAME, touched.id, {
					httpOnly: true,
					sameSite: 'strict',
					path: '/',
					secure: env.NODE_ENV === 'production',
					maxAge: DEVICE_COOKIE_MAX_AGE,
				});
				return;
			}
			// Cookie present but no matching row for this user (deleted device or
			// stale cookie) — fall through to UA-based upsert.
		}

		// ── Step 2: UA-based upsert (fallback fingerprint) ──────────────────────
		// Used on first login (no cookie yet) or when the cookie doesn't resolve.
		// Upserts on (userId, userAgent). isNew=true → fires audit event + alert.
		const result = await this.deviceRepository
			.upsert({
				userId,
				deviceName: parseDeviceName(userAgent),
				deviceType: parseDeviceType(userAgent),
				userAgent,
				ipAddress: ip,
			})
			.catch(() => null);

		const deviceId = result?.id;
		const isNewDevice = result?.isNew ?? false;
		const isNewLocation =
			!isNewDevice &&
			result?.previousIpAddress !== undefined &&
			result.previousIpAddress !== ip;

		ctx.context.deviceId = deviceId;

		if (isNewDevice && deviceId) {
			void this.systemAuditLog
				.log({
					eventType: 'new_device_detected',
					systemId,
					details: { userId, deviceId, correlationId },
				})
				.catch(() => undefined);
		}

		if (deviceId) {
			ctx.setCookie(DEVICE_COOKIE_NAME, deviceId, {
				httpOnly: true,
				sameSite: 'strict',
				path: '/',
				secure: env.NODE_ENV === 'production',
				maxAge: DEVICE_COOKIE_MAX_AGE,
			});
		}

		if ((isNewDevice || isNewLocation) && deviceId) {
			void this.sendLoginAlert(userId, userAgent, ip).catch((err: unknown) => {
				auditLogger.warn(
					{
						level: 'security',
						event: 'login_alert_email_send_failed',
						userId,
						err,
					},
					'Login alert email send failed',
				);
			});
		}
	}

	private async sendLoginAlert(
		userId: string,
		userAgent: string,
		ip: string,
	): Promise<void> {
		const user = await this.userRepository.findById(userId);
		if (!user) return;

		const token = generateRecoveryToken(userId, env.BETTER_AUTH_SECRET);
		const recoveryUrl = `${env.CLIENT_URL}/security/recover?token=${token}`;

		await this.emailService.sendLoginAlertEmail(
			user.email.value,
			parseDeviceName(userAgent),
			ip,
			new Date(),
			recoveryUrl,
		);
	}
}
