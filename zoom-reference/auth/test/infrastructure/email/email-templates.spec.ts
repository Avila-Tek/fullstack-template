import { describe, expect, it } from 'vitest';
import { EmailTemplates } from '../../../src/infrastructure/email/email-templates';

const XSS_PAYLOAD = '<script>alert("xss")</script>';
const XSS_ATTR_PAYLOAD = '" onmouseover="alert(1)"';
const XSS_IMG_PAYLOAD = '<img src=x onerror=alert(1)>';

function expectTagsEscaped(html: string): void {
	expect(html).not.toContain('<script>');
	expect(html).not.toContain('<img src=x');
}

function expectAttrEscaped(html: string, payload: string): void {
	expect(html).not.toContain(payload);
	expect(html).toContain('&quot;');
}

describe('email-templates', () => {
	describe('EmailTemplate.verificationEmail()', () => {
		it('includes the verification URL', () => {
			const html = EmailTemplates.verificationEmail(
				'https://example.com/verify?token=abc',
			);
			expect(html).toContain('https://example.com/verify?token=abc');
		});

		it('returns a non-empty string', () => {
			expect(
				EmailTemplates.verificationEmail('https://example.com'),
			).toBeTruthy();
		});

		it('contains the expected Spanish title', () => {
			const html = EmailTemplates.verificationEmail('https://example.com');
			expect(html).toContain('Activa tu cuenta');
		});

		it('contains the CTA href pointing to the verification URL', () => {
			const url = 'https://example.com/verify?token=abc';
			const html = EmailTemplates.verificationEmail(url);
			expect(html).toContain(`href="${url}"`);
		});

		it('CTA href encodes HTML-special characters in URL parameters', () => {
			const maliciousUrl = `https://example.com?x=${XSS_PAYLOAD}`;
			const html = EmailTemplates.verificationEmail(maliciousUrl);
			expect(html).not.toContain('<script>');
			expect(html).not.toContain(`href="${maliciousUrl}"`);
			expect(html).toContain('href="https://example.com');
		});
	});

	describe('EmailTemplate.welcomeEmail()', () => {
		it('returns a non-empty string', () => {
			expect(
				EmailTemplates.welcomeEmail('https://app.example.com'),
			).toBeTruthy();
		});

		it('contains the expected Spanish title', () => {
			const html = EmailTemplates.welcomeEmail('https://app.example.com');
			expect(html).toContain('¡Bienvenido a Mi ZOOM!');
		});

		it('contains the CTA href pointing to the app URL', () => {
			const html = EmailTemplates.welcomeEmail('https://app.example.com');
			expect(html).toContain('href="https://app.example.com"');
		});
	});

	describe('EmailTemplate.passwordResetEmail()', () => {
		it('includes the reset URL', () => {
			const html = EmailTemplates.passwordResetEmail(
				'https://example.com/reset?token=xyz',
				'1 hora(s)',
			);
			expect(html).toContain('https://example.com/reset?token=xyz');
		});

		it('contains the expected Spanish title', () => {
			const html = EmailTemplates.passwordResetEmail(
				'https://example.com/reset',
				'1 hora(s)',
			);
			expect(html).toContain('Restablece tu contraseña');
		});

		it('contains the CTA href pointing to the reset URL', () => {
			const url = 'https://example.com/reset?token=xyz';
			const html = EmailTemplates.passwordResetEmail(url, '1 hora(s)');
			expect(html).toContain(`href="${url}"`);
		});

		it('CTA href encodes HTML-special characters in URL parameters', () => {
			const maliciousUrl = `https://example.com?x=${XSS_PAYLOAD}`;
			const html = EmailTemplates.passwordResetEmail(maliciousUrl, '1h');
			expect(html).not.toContain('<script>');
			expect(html).not.toContain(`href="${maliciousUrl}"`);
			expect(html).toContain('href="https://example.com');
		});
	});

	describe('EmailTemplate.loginAlertEmail()', () => {
		it('includes device, IP, timestamp and recovery URL', () => {
			const ts = new Date('2024-01-15T10:00:00Z');
			const html = EmailTemplates.loginAlertEmail(
				'Chrome on macOS',
				'1.2.3.4',
				ts,
				'https://example.com/recover',
			);
			expect(html).toContain('Chrome on macOS');
			expect(html).toContain('1.2.3.4');
			expect(html).toContain(ts.toUTCString());
			expect(html).toContain('https://example.com/recover');
		});

		it('contains the expected Spanish title', () => {
			const html = EmailTemplates.loginAlertEmail(
				'Chrome',
				'1.2.3.4',
				new Date(),
				'https://example.com/recover',
			);
			expect(html).toContain('Nuevo inicio de sesión detectado');
		});

		it('contains the CTA href pointing to the recovery URL', () => {
			const url = 'https://example.com/recover';
			const html = EmailTemplates.loginAlertEmail(
				'Chrome',
				'1.2.3.4',
				new Date(),
				url,
			);
			expect(html).toContain(`href="${url}"`);
		});

		it('escapes XSS payload in deviceName', () => {
			const html = EmailTemplates.loginAlertEmail(
				XSS_PAYLOAD,
				'1.2.3.4',
				new Date(),
				'https://example.com/recover',
			);
			expectTagsEscaped(html);
			expect(html).toContain('&lt;script&gt;');
		});

		it('escapes XSS payload in IP address', () => {
			const html = EmailTemplates.loginAlertEmail(
				'Chrome',
				XSS_PAYLOAD,
				new Date(),
				'https://example.com/recover',
			);
			expectTagsEscaped(html);
			expect(html).toContain('&lt;script&gt;');
		});

		it('escapes attribute breakout attempt in deviceName', () => {
			const html = EmailTemplates.loginAlertEmail(
				XSS_ATTR_PAYLOAD,
				'1.2.3.4',
				new Date(),
				'https://example.com/recover',
			);
			expectAttrEscaped(html, XSS_ATTR_PAYLOAD);
		});

		it('escapes img onerror payload in deviceName', () => {
			const html = EmailTemplates.loginAlertEmail(
				XSS_IMG_PAYLOAD,
				'1.2.3.4',
				new Date(),
				'https://example.com/recover',
			);
			expectTagsEscaped(html);
			expect(html).toContain('&lt;img');
		});
	});

	describe('EmailTemplate.twoFactorOtpEmail()', () => {
		it('includes the OTP code', () => {
			const html = EmailTemplates.twoFactorOtpEmail('987654');
			expect(html).toContain('987654');
		});

		it('contains the expected Spanish title', () => {
			const html = EmailTemplates.twoFactorOtpEmail('123456');
			expect(html).toContain('Tu código de verificación');
		});

		it('escapes XSS payload in OTP field', () => {
			const html = EmailTemplates.twoFactorOtpEmail(XSS_PAYLOAD);
			expectTagsEscaped(html);
			expect(html).toContain('&lt;script&gt;');
		});
	});

	describe('EmailTemplate.emailChangeVerificationEmail()', () => {
		it('includes the verification URL', () => {
			const html = EmailTemplates.emailChangeVerificationEmail(
				'https://example.com/verify-change',
			);
			expect(html).toContain('https://example.com/verify-change');
		});

		it('contains the expected Spanish title', () => {
			const html = EmailTemplates.emailChangeVerificationEmail(
				'https://example.com/verify-change',
			);
			expect(html).toContain('Confirma tu nuevo correo');
		});

		it('contains the CTA href pointing to the verification URL', () => {
			const url = 'https://example.com/verify-change';
			const html = EmailTemplates.emailChangeVerificationEmail(url);
			expect(html).toContain(`href="${url}"`);
		});

		it('CTA href encodes HTML-special characters in URL parameters', () => {
			const maliciousUrl = `https://example.com?x=${XSS_PAYLOAD}`;
			const html = EmailTemplates.emailChangeVerificationEmail(maliciousUrl);
			expect(html).not.toContain('<script>');
			expect(html).not.toContain(`href="${maliciousUrl}"`);
			expect(html).toContain('href="https://example.com');
		});
	});

	describe('EmailTemplate.sessionRevokedEmail()', () => {
		it('contains the expected Spanish title', () => {
			const html = EmailTemplates.sessionRevokedEmail(false);
			expect(html).toContain('Alerta de seguridad: sesiones terminadas');
		});

		it('includes 2FA notice in Spanish when twoFactorForced is true', () => {
			const html = EmailTemplates.sessionRevokedEmail(true);
			expect(html).toContain(
				'autenticación de dos factores por correo ha sido activada',
			);
		});

		it('does not include 2FA notice when twoFactorForced is false', () => {
			const html = EmailTemplates.sessionRevokedEmail(false);
			expect(html).not.toContain(
				'autenticación de dos factores por correo ha sido activada',
			);
		});
	});

	describe('EmailTemplate.failedLoginAlertEmail()', () => {
		it('includes IP, userAgent and timestamp', () => {
			const ts = new Date('2024-03-10T12:00:00Z');
			const html = EmailTemplates.failedLoginAlertEmail({
				ipAddress: '5.6.7.8',
				userAgent: 'Mozilla/5.0',
				timestamp: ts,
				twoFactorSuggested: false,
				twoFactorSettingsUrl: '',
			});
			expect(html).toContain('5.6.7.8');
			expect(html).toContain('Mozilla/5.0');
			expect(html).toContain(ts.toUTCString());
		});

		it('contains the expected Spanish title', () => {
			const html = EmailTemplates.failedLoginAlertEmail({
				ipAddress: '5.6.7.8',
				userAgent: 'UA',
				timestamp: new Date(),
				twoFactorSuggested: false,
				twoFactorSettingsUrl: '',
			});
			expect(html).toContain('Intentos de inicio de sesión fallidos');
		});

		it('includes 2FA CTA href when twoFactorSuggested is true', () => {
			const html = EmailTemplates.failedLoginAlertEmail({
				ipAddress: '5.6.7.8',
				userAgent: 'UA',
				timestamp: new Date(),
				twoFactorSuggested: true,
				twoFactorSettingsUrl: 'https://example.com/2fa',
			});
			expect(html).toContain('href="https://example.com/2fa"');
		});

		it('omits 2FA section when twoFactorSuggested is false', () => {
			const html = EmailTemplates.failedLoginAlertEmail({
				ipAddress: '5.6.7.8',
				userAgent: 'UA',
				timestamp: new Date(),
				twoFactorSuggested: false,
				twoFactorSettingsUrl: 'https://example.com/2fa',
			});
			expect(html).not.toContain('https://example.com/2fa');
		});

		it('escapes XSS payload in IP address', () => {
			const html = EmailTemplates.failedLoginAlertEmail({
				ipAddress: XSS_PAYLOAD,
				userAgent: 'Mozilla/5.0',
				timestamp: new Date(),
				twoFactorSuggested: false,
				twoFactorSettingsUrl: '',
			});
			expectTagsEscaped(html);
			expect(html).toContain('&lt;script&gt;');
		});

		it('escapes XSS payload in userAgent', () => {
			const html = EmailTemplates.failedLoginAlertEmail({
				ipAddress: '5.6.7.8',
				userAgent: XSS_PAYLOAD,
				timestamp: new Date(),
				twoFactorSuggested: false,
				twoFactorSettingsUrl: '',
			});
			expectTagsEscaped(html);
			expect(html).toContain('&lt;script&gt;');
		});

		it('escapes attribute breakout attempt in userAgent', () => {
			const html = EmailTemplates.failedLoginAlertEmail({
				ipAddress: '5.6.7.8',
				userAgent: XSS_ATTR_PAYLOAD,
				timestamp: new Date(),
				twoFactorSuggested: false,
				twoFactorSettingsUrl: '',
			});
			expectAttrEscaped(html, XSS_ATTR_PAYLOAD);
		});

		it('escapes img onerror payload in IP address', () => {
			const html = EmailTemplates.failedLoginAlertEmail({
				ipAddress: XSS_IMG_PAYLOAD,
				userAgent: 'UA',
				timestamp: new Date(),
				twoFactorSuggested: false,
				twoFactorSettingsUrl: '',
			});
			expectTagsEscaped(html);
			expect(html).toContain('&lt;img');
		});
	});
});
