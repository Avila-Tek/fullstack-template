import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../src/env', () => ({
	env: {
		ZOOM_EMAIL_API_URL: 'https://zoom-api.test/email',
		ZOOM_EMAIL_SENDER_ID: 1,
		NODE_ENV: 'production',
		PASSWORD_RESET_TOKEN_TTL_SECONDS: 3600,
		ZOOM_API_TIMEOUT_MS: 5000,
		ZOOM_API_RETRY_MAX: 3,
		ZOOM_API_RETRY_BACKOFF_MS: 0,
		CLIENT_URL: 'https://app.zoom.test',
	},
}));

import { ZoomEmailAdapter } from '../../../src/infrastructure/email/zoom-email.adapter';
import { ZoomAuthService } from '../../../src/infrastructure/zoom/zoom-auth.service';

const SUCCESS_EMAIL_RESPONSE = {
	codrespuesta: 'COD_000',
	mensaje: 'CORREO ENVIADO EXITOSAMENTE',
	entidadRespuesta: { estatus: 'Enviado exitosamente' },
};

// ZoomEmailAdapter delegates fetch logic to ZoomEmailClient (tested in
// packages/providers). These tests verify that the adapter:
//   1. Calls the underlying client with the right arguments
//   2. Renders templates correctly (subject, contenido)
function makeAuthService(token = 'tok-email') {
	const client = {
		getToken: vi.fn().mockResolvedValue(token),
		invalidateToken: vi.fn(),
	};
	return { client } as unknown as ZoomAuthService;
}

function mockFetch(response: unknown, status = 200) {
	return vi.fn().mockResolvedValue({
		status,
		json: vi.fn().mockResolvedValue(response),
	});
}

describe('ZoomEmailAdapter', () => {
	let authService: ZoomAuthService;
	let adapter: ZoomEmailAdapter;

	beforeEach(() => {
		authService = makeAuthService();
		adapter = new ZoomEmailAdapter(authService);
		vi.stubGlobal('fetch', mockFetch(SUCCESS_EMAIL_RESPONSE));
	});

	describe('sendVerificationEmail()', () => {
		it('posts to ZOOM_EMAIL_API_URL with html type', async () => {
			await adapter.sendVerificationEmail(
				'user@example.com',
				'https://example.com/verify',
			);
			const [url, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
			expect(url).toBe('https://zoom-api.test/email');
			const body = JSON.parse(options.body);
			expect(body.tipo).toBe('html');
			expect(body.destinatario).toBe('user@example.com');
			expect(body.contenido).toContain('https://example.com/verify');
		});

		it('uses bearer token from auth service client', async () => {
			await adapter.sendVerificationEmail(
				'user@example.com',
				'https://example.com/verify',
			);
			expect(authService.client.getToken).toHaveBeenCalledOnce();
			const [, options] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
			expect(options.headers.Authorization).toBe('Bearer tok-email');
		});
	});

	describe('sendTwoFactorOtpEmail()', () => {
		it('includes OTP in contenido', async () => {
			await adapter.sendTwoFactorOtpEmail('user@example.com', '112233');
			const body = JSON.parse(
				(fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
			);
			expect(body.contenido).toContain('112233');
		});
	});

	describe('sendPasswordResetEmail()', () => {
		it('includes reset URL in contenido', async () => {
			await adapter.sendPasswordResetEmail(
				'user@example.com',
				'https://example.com/reset',
			);
			const body = JSON.parse(
				(fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
			);
			expect(body.contenido).toContain('https://example.com/reset');
		});
	});

	describe('sendLoginAlertEmail()', () => {
		it('includes device and IP in contenido', async () => {
			await adapter.sendLoginAlertEmail(
				'user@example.com',
				'Chrome on macOS',
				'1.2.3.4',
				new Date(),
				'https://example.com/recover',
			);
			const body = JSON.parse(
				(fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
			);
			expect(body.contenido).toContain('Chrome on macOS');
			expect(body.contenido).toContain('1.2.3.4');
		});
	});

	describe('sendWelcomeEmail()', () => {
		it('sends an email', async () => {
			await adapter.sendWelcomeEmail('user@example.com');
			expect(fetch).toHaveBeenCalledOnce();
		});

		it('uses CLIENT_URL as the CTA href', async () => {
			await adapter.sendWelcomeEmail('user@example.com');
			const body = JSON.parse(
				(fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
			);
			expect(body.contenido).toContain('href="https://app.zoom.test"');
		});
	});

	describe('sendEmailChangeVerificationEmail()', () => {
		it('includes verification URL in contenido', async () => {
			await adapter.sendEmailChangeVerificationEmail(
				'user@example.com',
				'https://example.com/verify-change',
			);
			const body = JSON.parse(
				(fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
			);
			expect(body.contenido).toContain('https://example.com/verify-change');
		});
	});

	describe('sendSessionRevokedEmail()', () => {
		it('sends an email', async () => {
			await adapter.sendSessionRevokedEmail('user@example.com', false);
			expect(fetch).toHaveBeenCalledOnce();
		});
	});

	describe('sendFailedLoginAlertEmail()', () => {
		it('includes IP address in contenido', async () => {
			await adapter.sendFailedLoginAlertEmail('user@example.com', {
				ipAddress: '5.6.7.8',
				userAgent: 'Mozilla/5.0',
				timestamp: new Date(),
				twoFactorSuggested: false,
				twoFactorSettingsUrl: '',
			});
			const body = JSON.parse(
				(fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
			);
			expect(body.contenido).toContain('5.6.7.8');
		});

		it('includes 2FA settings URL when twoFactorSuggested is true', async () => {
			const twoFactorUrl = 'https://example.com/two-factor-settings';
			await adapter.sendFailedLoginAlertEmail('user@example.com', {
				ipAddress: '5.6.7.8',
				userAgent: 'Mozilla/5.0',
				timestamp: new Date(),
				twoFactorSuggested: true,
				twoFactorSettingsUrl: twoFactorUrl,
			});
			const body = JSON.parse(
				(fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body,
			);
			expect(body.contenido).toContain(twoFactorUrl);
		});
	});
});
