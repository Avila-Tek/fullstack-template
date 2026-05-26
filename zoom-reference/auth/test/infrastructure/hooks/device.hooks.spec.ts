/**
 * Tests for DeviceHook
 *
 * @AfterHook('/sign-in/email'):
 *   - Reads userId from ctx.context.returned.user.id
 *   - Reads systemId from ctx.context.systemResolution (set by SignInHook.before)
 *   - Upserts device, stores deviceId in ctx.context.deviceId, refreshes cookie
 *   - Fires new_device_detected audit event on first login from this device
 *   - Sends login-alert email on new device or new IP location
 *
 * @AfterHook('/callback/:provider'):
 *   - Reads userId from ctx.context.newSession.user.id
 *   - Reads systemId from ctx.context.systemResolution (set by SocialCallbackHook.before)
 *   - Reads correlationId from getOAuthState()
 *   - Same upsert + cookie + alert behaviour as the email path
 */

// ---------------------------------------------------------------------------
// Module-level mocks — must be at top for vi.mock hoisting
// ---------------------------------------------------------------------------

vi.mock('../../../src/env', () => ({
	env: {
		NODE_ENV: 'test',
		BETTER_AUTH_SECRET: 'test-secret',
		CLIENT_URL: 'http://localhost:4200',
	},
}));

vi.mock('better-auth/api', () => ({
	getOAuthState: vi.fn(),
}));

vi.mock('../../../src/shared/utils/generate-recovery-token', () => ({
	generateRecoveryToken: vi.fn().mockReturnValue('mock-recovery-token'),
}));

vi.mock('../../../src/shared/logger/audit-logger', () => ({
	auditLogger: { warn: vi.fn(), info: vi.fn() },
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { getOAuthState } from 'better-auth/api';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { DeviceRepositoryPort } from '../../../src/application/ports/out/device-repository.port';
import type { EmailServicePort } from '../../../src/application/ports/out/email-service.port';
import type { SystemAuditLogPort } from '../../../src/application/ports/out/system-audit-log.port';
import type { UserRepositoryPort } from '../../../src/application/ports/out/user-repository.port';
import { Email } from '../../../src/domain/value-objects/user.value-object';
import { DeviceHook } from '../../../src/infrastructure/hooks/device.hooks';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SYSTEM_RESOLUTION = {
	systemId: 'sys-001',
	organizationId: 'org-001',
	accessModel: 'open' as const,
	apiBaseUrl: 'https://api.example.com',
	status: 'active' as const,
};

const USER_ID = 'user-abc';
const DEVICE_ID = 'device-001';
const CORRELATION_ID = 'corr-123';

// ---------------------------------------------------------------------------
// Factories
// ---------------------------------------------------------------------------

function makeDeviceRepo(
	upsertResult: {
		id?: string;
		isNew?: boolean;
		previousIpAddress?: string;
	} = {},
): DeviceRepositoryPort {
	return {
		upsert: vi.fn().mockResolvedValue({
			id: upsertResult.id ?? DEVICE_ID,
			isNew: upsertResult.isNew ?? false,
			previousIpAddress: upsertResult.previousIpAddress,
		}),
		touchDevice: vi.fn().mockResolvedValue(null),
	} as unknown as DeviceRepositoryPort;
}

function makeSystemAuditLog(): SystemAuditLogPort {
	return {
		log: vi.fn().mockResolvedValue(undefined),
	} as unknown as SystemAuditLogPort;
}

function makeEmailService(): EmailServicePort {
	return {
		sendLoginAlertEmail: vi.fn().mockResolvedValue(undefined),
		sendVerificationEmail: vi.fn(),
		sendWelcomeEmail: vi.fn(),
		sendPasswordResetEmail: vi.fn(),
		sendEmailChangeVerificationEmail: vi.fn(),
	} as unknown as EmailServicePort;
}

function makeUserRepo(emailValue = 'user@example.com'): UserRepositoryPort {
	const emailObj = Email.create(emailValue);
	return {
		findById: vi
			.fn()
			.mockResolvedValue({ id: USER_ID, email: emailObj, emailVerified: true }),
		findByEmail: vi.fn().mockResolvedValue(null),
		save: vi.fn().mockResolvedValue(undefined),
	} as unknown as UserRepositoryPort;
}

function makeHook(
	overrides: {
		deviceRepo?: DeviceRepositoryPort;
		systemAuditLog?: SystemAuditLogPort;
		emailService?: EmailServicePort;
		userRepo?: UserRepositoryPort;
	} = {},
): DeviceHook {
	return new DeviceHook(
		overrides.deviceRepo ?? makeDeviceRepo(),
		overrides.systemAuditLog ?? makeSystemAuditLog(),
		overrides.emailService ?? makeEmailService(),
		overrides.userRepo ?? makeUserRepo(),
	);
}

function makeSignInCtx(
	overrides: {
		hasRequest?: boolean;
		returned?: unknown;
		systemResolution?: unknown;
		correlationId?: string;
		cookieDeviceId?: string;
	} = {},
	// biome-ignore lint/suspicious/noExplicitAny: structural mock for AuthHookContext
): any {
	const context: Record<string, unknown> = {
		returned:
			overrides.returned !== undefined
				? overrides.returned
				: {
						user: { id: USER_ID, email: 'user@example.com' },
						session: { id: 'sess-1' },
					},
		systemResolution:
			overrides.systemResolution !== undefined
				? overrides.systemResolution
				: SYSTEM_RESOLUTION,
		correlationId: overrides.correlationId ?? CORRELATION_ID,
	};

	return {
		request:
			overrides.hasRequest === false
				? undefined
				: ({ method: 'POST' } as unknown as Request),
		context,
		getHeader: (name: string) => {
			if (name === 'user-agent') return 'Mozilla/5.0 test-agent';
			if (name === 'x-forwarded-for') return '1.2.3.4';
			return null;
		},
		getCookie: vi
			.fn()
			.mockImplementation((name: string) =>
				name === 'zoom_device_id' ? (overrides.cookieDeviceId ?? null) : null,
			),
		setCookie: vi.fn(),
	};
}

function makeCallbackCtx(
	overrides: {
		hasRequest?: boolean;
		newSession?: unknown;
		systemResolution?: unknown;
		cookieDeviceId?: string;
	} = {},
	// biome-ignore lint/suspicious/noExplicitAny: structural mock for AuthHookContext
): any {
	const context: Record<string, unknown> = {
		newSession:
			overrides.newSession !== undefined
				? overrides.newSession
				: {
						user: { id: USER_ID, email: 'user@example.com' },
						session: { id: 'sess-1' },
					},
		systemResolution:
			overrides.systemResolution !== undefined
				? overrides.systemResolution
				: SYSTEM_RESOLUTION,
	};

	return {
		request:
			overrides.hasRequest === false
				? undefined
				: ({ method: 'GET' } as unknown as Request),
		context,
		getHeader: (name: string) => {
			if (name === 'user-agent') return 'Mozilla/5.0 test-agent';
			if (name === 'x-forwarded-for') return '1.2.3.4';
			return null;
		},
		getCookie: vi
			.fn()
			.mockImplementation((name: string) =>
				name === 'zoom_device_id' ? (overrides.cookieDeviceId ?? null) : null,
			),
		setCookie: vi.fn(),
	};
}

afterEach(() => vi.clearAllMocks());

// ---------------------------------------------------------------------------
// DeviceHook.afterSignIn()
// ---------------------------------------------------------------------------

describe('DeviceHook.afterSignIn()', () => {
	it('no-ops when ctx.request is absent', async () => {
		const deviceRepo = makeDeviceRepo();
		await makeHook({ deviceRepo }).afterSignIn(
			makeSignInCtx({ hasRequest: false }),
		);
		expect(deviceRepo.upsert).not.toHaveBeenCalled();
	});

	it('no-ops when returned has no user.id', async () => {
		const deviceRepo = makeDeviceRepo();
		await makeHook({ deviceRepo }).afterSignIn(
			makeSignInCtx({ returned: { statusCode: 401, body: {} } }),
		);
		expect(deviceRepo.upsert).not.toHaveBeenCalled();
	});

	it('no-ops when systemResolution is absent from context', async () => {
		const deviceRepo = makeDeviceRepo();
		const ctx = makeSignInCtx({ systemResolution: undefined });
		delete ctx.context.systemResolution;
		await makeHook({ deviceRepo }).afterSignIn(ctx);
		expect(deviceRepo.upsert).not.toHaveBeenCalled();
	});

	it('calls deviceRepository.upsert with userId, userAgent, ip, deviceName, deviceType', async () => {
		const deviceRepo = makeDeviceRepo();
		await makeHook({ deviceRepo }).afterSignIn(makeSignInCtx());
		expect(deviceRepo.upsert).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: USER_ID,
				userAgent: 'Mozilla/5.0 test-agent',
				ipAddress: '1.2.3.4',
			}),
		);
	});

	it('stores deviceId in ctx.context.deviceId', async () => {
		const deviceRepo = makeDeviceRepo({ id: 'device-xyz' });
		const ctx = makeSignInCtx();
		await makeHook({ deviceRepo }).afterSignIn(ctx);
		expect(ctx.context.deviceId).toBe('device-xyz');
	});

	it('stores undefined in ctx.context.deviceId when upsert fails', async () => {
		const deviceRepo = makeDeviceRepo();
		(deviceRepo.upsert as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error('DB down'),
		);
		const ctx = makeSignInCtx();
		await makeHook({ deviceRepo }).afterSignIn(ctx);
		expect(ctx.context.deviceId).toBeUndefined();
	});

	it('sets zoom_device_id cookie with httpOnly: true and sameSite: strict', async () => {
		const ctx = makeSignInCtx();
		await makeHook().afterSignIn(ctx);
		expect(ctx.setCookie).toHaveBeenCalledWith(
			'zoom_device_id',
			DEVICE_ID,
			expect.objectContaining({ httpOnly: true, sameSite: 'strict' }),
		);
	});

	it('does not set cookie when upsert fails', async () => {
		const deviceRepo = makeDeviceRepo();
		(deviceRepo.upsert as ReturnType<typeof vi.fn>).mockRejectedValue(
			new Error('DB down'),
		);
		const ctx = makeSignInCtx();
		await makeHook({ deviceRepo }).afterSignIn(ctx);
		expect(ctx.setCookie).not.toHaveBeenCalled();
	});

	it('fires new_device_detected audit event when isNew is true', async () => {
		const deviceRepo = makeDeviceRepo({ isNew: true });
		const systemAuditLog = makeSystemAuditLog();
		await makeHook({ deviceRepo, systemAuditLog }).afterSignIn(makeSignInCtx());
		await Promise.resolve();
		expect(systemAuditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({ eventType: 'new_device_detected' }),
		);
	});

	it('does NOT fire new_device_detected when device already existed', async () => {
		const deviceRepo = makeDeviceRepo({ isNew: false });
		const systemAuditLog = makeSystemAuditLog();
		await makeHook({ deviceRepo, systemAuditLog }).afterSignIn(makeSignInCtx());
		await Promise.resolve();
		expect(systemAuditLog.log).not.toHaveBeenCalled();
	});

	it('sends login-alert email when isNew is true', async () => {
		const deviceRepo = makeDeviceRepo({ isNew: true });
		const emailService = makeEmailService();
		await makeHook({ deviceRepo, emailService }).afterSignIn(makeSignInCtx());
		await Promise.resolve();
		expect(emailService.sendLoginAlertEmail).toHaveBeenCalledOnce();
	});

	it('sends login-alert email when IP changed (new location)', async () => {
		const deviceRepo = makeDeviceRepo({
			isNew: false,
			previousIpAddress: '9.9.9.9', // different from ctx IP 1.2.3.4
		});
		const emailService = makeEmailService();
		await makeHook({ deviceRepo, emailService }).afterSignIn(makeSignInCtx());
		await Promise.resolve();
		expect(emailService.sendLoginAlertEmail).toHaveBeenCalledOnce();
	});

	it('does NOT send email when device existed and IP is unchanged', async () => {
		const deviceRepo = makeDeviceRepo({
			isNew: false,
			previousIpAddress: '1.2.3.4', // same as ctx IP
		});
		const emailService = makeEmailService();
		await makeHook({ deviceRepo, emailService }).afterSignIn(makeSignInCtx());
		await Promise.resolve();
		expect(emailService.sendLoginAlertEmail).not.toHaveBeenCalled();
	});

	it('sends alert to the user email fetched from userRepository', async () => {
		const deviceRepo = makeDeviceRepo({ isNew: true });
		const emailService = makeEmailService();
		const userRepo = makeUserRepo('alert@example.com');
		await makeHook({ deviceRepo, emailService, userRepo }).afterSignIn(
			makeSignInCtx(),
		);
		await Promise.resolve();
		expect(emailService.sendLoginAlertEmail).toHaveBeenCalledWith(
			'alert@example.com',
			expect.any(String),
			expect.any(String),
			expect.any(Date),
			expect.stringContaining('/security/recover'),
		);
	});

	it('does not throw when userRepository returns null (alert is fire-and-forget)', async () => {
		const deviceRepo = makeDeviceRepo({ isNew: true });
		const userRepo = makeUserRepo();
		(userRepo.findById as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		await expect(
			makeHook({ deviceRepo, userRepo }).afterSignIn(makeSignInCtx()),
		).resolves.toBeUndefined();
	});

	it('does not throw when emailService rejects (alert is fire-and-forget)', async () => {
		const deviceRepo = makeDeviceRepo({ isNew: true });
		const emailService = makeEmailService();
		(
			emailService.sendLoginAlertEmail as ReturnType<typeof vi.fn>
		).mockRejectedValue(new Error('SMTP down'));
		await expect(
			makeHook({ deviceRepo, emailService }).afterSignIn(makeSignInCtx()),
		).resolves.toBeUndefined();
	});

	// ── Cookie-based fingerprint ─────────────────────────────────────────────

	it('skips upsert when zoom_device_id cookie resolves to a known device', async () => {
		const deviceRepo = makeDeviceRepo();
		(deviceRepo.touchDevice as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: 'cookie-device-id',
		});
		const ctx = makeSignInCtx({ cookieDeviceId: 'cookie-device-id' });
		await makeHook({ deviceRepo }).afterSignIn(ctx);
		expect(deviceRepo.upsert).not.toHaveBeenCalled();
		expect(ctx.context.deviceId).toBe('cookie-device-id');
		expect(ctx.setCookie).toHaveBeenCalledWith(
			'zoom_device_id',
			'cookie-device-id',
			expect.objectContaining({ httpOnly: true }),
		);
	});

	it('calls touchDevice with id, userId, current UA and IP when cookie resolves', async () => {
		const deviceRepo = makeDeviceRepo();
		(deviceRepo.touchDevice as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: 'cookie-device-id',
		});
		await makeHook({ deviceRepo }).afterSignIn(
			makeSignInCtx({ cookieDeviceId: 'cookie-device-id' }),
		);
		expect(deviceRepo.touchDevice).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'cookie-device-id',
				userId: USER_ID,
				userAgent: 'Mozilla/5.0 test-agent',
				ipAddress: '1.2.3.4',
			}),
		);
	});

	it('does not fire new_device_detected when device found via cookie', async () => {
		const deviceRepo = makeDeviceRepo();
		(deviceRepo.touchDevice as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: 'cookie-device-id',
		});
		const systemAuditLog = makeSystemAuditLog();
		await makeHook({ deviceRepo, systemAuditLog }).afterSignIn(
			makeSignInCtx({ cookieDeviceId: 'cookie-device-id' }),
		);
		await Promise.resolve();
		expect(systemAuditLog.log).not.toHaveBeenCalled();
	});

	it('does not send alert email when device found via cookie', async () => {
		const deviceRepo = makeDeviceRepo();
		(deviceRepo.touchDevice as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: 'cookie-device-id',
		});
		const emailService = makeEmailService();
		await makeHook({ deviceRepo, emailService }).afterSignIn(
			makeSignInCtx({ cookieDeviceId: 'cookie-device-id' }),
		);
		await Promise.resolve();
		expect(emailService.sendLoginAlertEmail).not.toHaveBeenCalled();
	});

	it('falls through to upsert when touchDevice returns null (stale cookie)', async () => {
		const deviceRepo = makeDeviceRepo({ id: 'upserted-id', isNew: false });
		await makeHook({ deviceRepo }).afterSignIn(
			makeSignInCtx({ cookieDeviceId: 'stale-cookie-id' }),
		);
		expect(deviceRepo.upsert).toHaveBeenCalledOnce();
	});
});

// ---------------------------------------------------------------------------
// DeviceHook.afterCallback()
// ---------------------------------------------------------------------------

describe('DeviceHook.afterCallback()', () => {
	beforeEach(() => {
		(getOAuthState as ReturnType<typeof vi.fn>).mockResolvedValue({
			correlationId: CORRELATION_ID,
		});
	});

	it('no-ops when ctx.request is absent', async () => {
		const deviceRepo = makeDeviceRepo();
		await makeHook({ deviceRepo }).afterCallback(
			makeCallbackCtx({ hasRequest: false }),
		);
		expect(deviceRepo.upsert).not.toHaveBeenCalled();
	});

	it('no-ops when systemResolution is absent from context', async () => {
		const deviceRepo = makeDeviceRepo();
		const ctx = makeCallbackCtx({ systemResolution: undefined });
		delete ctx.context.systemResolution;
		await makeHook({ deviceRepo }).afterCallback(ctx);
		expect(deviceRepo.upsert).not.toHaveBeenCalled();
	});

	it('no-ops when newSession has no user.id', async () => {
		const deviceRepo = makeDeviceRepo();
		await makeHook({ deviceRepo }).afterCallback(
			makeCallbackCtx({ newSession: { user: {} } }),
		);
		expect(deviceRepo.upsert).not.toHaveBeenCalled();
	});

	it('no-ops when newSession is absent', async () => {
		const deviceRepo = makeDeviceRepo();
		const ctx = makeCallbackCtx();
		ctx.context.newSession = undefined;
		await makeHook({ deviceRepo }).afterCallback(ctx);
		expect(deviceRepo.upsert).not.toHaveBeenCalled();
	});

	it('calls upsert with userId and systemId from context', async () => {
		const deviceRepo = makeDeviceRepo();
		await makeHook({ deviceRepo }).afterCallback(makeCallbackCtx());
		expect(deviceRepo.upsert).toHaveBeenCalledWith(
			expect.objectContaining({ userId: USER_ID }),
		);
	});

	it('stores deviceId in ctx.context.deviceId', async () => {
		const deviceRepo = makeDeviceRepo({ id: 'cb-device-001' });
		const ctx = makeCallbackCtx();
		await makeHook({ deviceRepo }).afterCallback(ctx);
		expect(ctx.context.deviceId).toBe('cb-device-001');
	});

	it('passes correlationId from getOAuthState to new_device_detected audit event', async () => {
		const deviceRepo = makeDeviceRepo({ isNew: true });
		const systemAuditLog = makeSystemAuditLog();
		await makeHook({ deviceRepo, systemAuditLog }).afterCallback(
			makeCallbackCtx(),
		);
		await Promise.resolve();
		expect(systemAuditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({
				eventType: 'new_device_detected',
				details: expect.objectContaining({ correlationId: CORRELATION_ID }),
			}),
		);
	});

	it('uses undefined correlationId when getOAuthState returns null', async () => {
		(getOAuthState as ReturnType<typeof vi.fn>).mockResolvedValue(null);
		const deviceRepo = makeDeviceRepo({ isNew: true });
		const systemAuditLog = makeSystemAuditLog();
		await makeHook({ deviceRepo, systemAuditLog }).afterCallback(
			makeCallbackCtx(),
		);
		await Promise.resolve();
		expect(systemAuditLog.log).toHaveBeenCalledWith(
			expect.objectContaining({
				details: expect.objectContaining({ correlationId: undefined }),
			}),
		);
	});

	it('sends login-alert email when isNew is true', async () => {
		const deviceRepo = makeDeviceRepo({ isNew: true });
		const emailService = makeEmailService();
		await makeHook({ deviceRepo, emailService }).afterCallback(
			makeCallbackCtx(),
		);
		await Promise.resolve();
		expect(emailService.sendLoginAlertEmail).toHaveBeenCalledOnce();
	});

	it('sends login-alert email when IP changed (new location)', async () => {
		const deviceRepo = makeDeviceRepo({
			isNew: false,
			previousIpAddress: '9.9.9.9',
		});
		const emailService = makeEmailService();
		await makeHook({ deviceRepo, emailService }).afterCallback(
			makeCallbackCtx(),
		);
		await Promise.resolve();
		expect(emailService.sendLoginAlertEmail).toHaveBeenCalledOnce();
	});

	it('sends alert to the user email fetched from userRepository', async () => {
		const deviceRepo = makeDeviceRepo({ isNew: true });
		const emailService = makeEmailService();
		const userRepo = makeUserRepo('oauth-alert@example.com');
		await makeHook({ deviceRepo, emailService, userRepo }).afterCallback(
			makeCallbackCtx(),
		);
		await Promise.resolve();
		expect(emailService.sendLoginAlertEmail).toHaveBeenCalledWith(
			'oauth-alert@example.com',
			expect.any(String),
			expect.any(String),
			expect.any(Date),
			expect.stringContaining('/security/recover'),
		);
	});

	it('does NOT send email when device existed and IP is unchanged', async () => {
		const deviceRepo = makeDeviceRepo({
			isNew: false,
			previousIpAddress: '1.2.3.4',
		});
		const emailService = makeEmailService();
		await makeHook({ deviceRepo, emailService }).afterCallback(
			makeCallbackCtx(),
		);
		await Promise.resolve();
		expect(emailService.sendLoginAlertEmail).not.toHaveBeenCalled();
	});

	// ── Cookie-based fingerprint ─────────────────────────────────────────────

	it('skips upsert when zoom_device_id cookie resolves to a known device', async () => {
		const deviceRepo = makeDeviceRepo();
		(deviceRepo.touchDevice as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: 'cookie-device-id',
		});
		const ctx = makeCallbackCtx({ cookieDeviceId: 'cookie-device-id' });
		await makeHook({ deviceRepo }).afterCallback(ctx);
		expect(deviceRepo.upsert).not.toHaveBeenCalled();
		expect(ctx.context.deviceId).toBe('cookie-device-id');
		expect(ctx.setCookie).toHaveBeenCalledWith(
			'zoom_device_id',
			'cookie-device-id',
			expect.objectContaining({ httpOnly: true }),
		);
	});

	it('calls touchDevice with id, userId, current UA and IP when cookie resolves', async () => {
		const deviceRepo = makeDeviceRepo();
		(deviceRepo.touchDevice as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: 'cookie-device-id',
		});
		await makeHook({ deviceRepo }).afterCallback(
			makeCallbackCtx({ cookieDeviceId: 'cookie-device-id' }),
		);
		expect(deviceRepo.touchDevice).toHaveBeenCalledWith(
			expect.objectContaining({
				id: 'cookie-device-id',
				userId: USER_ID,
				userAgent: 'Mozilla/5.0 test-agent',
				ipAddress: '1.2.3.4',
			}),
		);
	});

	it('does not send alert email when device found via cookie', async () => {
		const deviceRepo = makeDeviceRepo();
		(deviceRepo.touchDevice as ReturnType<typeof vi.fn>).mockResolvedValue({
			id: 'cookie-device-id',
		});
		const emailService = makeEmailService();
		await makeHook({ deviceRepo, emailService }).afterCallback(
			makeCallbackCtx({ cookieDeviceId: 'cookie-device-id' }),
		);
		await Promise.resolve();
		expect(emailService.sendLoginAlertEmail).not.toHaveBeenCalled();
	});

	it('falls through to upsert when touchDevice returns null (stale cookie)', async () => {
		const deviceRepo = makeDeviceRepo({ id: 'upserted-id', isNew: false });
		await makeHook({ deviceRepo }).afterCallback(
			makeCallbackCtx({ cookieDeviceId: 'stale-cookie-id' }),
		);
		expect(deviceRepo.upsert).toHaveBeenCalledOnce();
	});
});
