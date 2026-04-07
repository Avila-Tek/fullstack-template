import { Inject, Injectable, Optional } from '@nestjs/common';
import nodemailer, { type Transporter } from 'nodemailer';
import { type IStructuredLogger, LOGGER_PORT } from '@/shared/domain-utils';
import type { EmailServicePort } from '../../application/ports/out/email-service.port';

// Defence-in-depth guard — recipients already passed Better Auth validation.
function assertValidEmail(email: string): void {
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
		throw new Error(`Invalid email address: ${email}`);
	}
}

function createTransporter(): Transporter {
	return nodemailer.createTransport({
		host: process.env.SMTP_HOST ?? 'localhost',
		port: Number(process.env.SMTP_PORT ?? 587),
		auth: process.env.SMTP_USER
			? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
			: undefined,
	});
}

@Injectable()
export class SmtpEmailAdapter implements EmailServicePort {
	private readonly from = process.env.EMAIL_FROM ?? 'noreply@example.com';
	private readonly transporter = createTransporter();

	constructor(
		@Inject(LOGGER_PORT)
		@Optional()
		private readonly logger?: IStructuredLogger,
	) {}

	async sendVerificationEmail(to: string, url: string): Promise<void> {
		const type = 'verification';
		assertValidEmail(to);
		this.logger?.debug({ event: 'email.send.start', type }, 'Sending email');
		try {
			await this.transporter.sendMail({
				from: this.from,
				to,
				subject: 'Verify your email address',
				html: `<p>Click the link below to verify your email address:</p>
<p><a href="${url}">${url}</a></p>
<p>This link expires in 1 hour.</p>`,
			});
			this.logger?.info({ event: 'email.send.success', type }, 'Email sent');
		} catch (err) {
			const errorCode = (err as { code?: string }).code ?? 'SMTP_ERROR';
			this.logger?.warn(
				{ event: 'email.send.error', type, errorCode },
				'Email send failed',
			);
			throw err;
		}
	}

	async sendPasswordResetEmail(to: string, url: string): Promise<void> {
		const type = 'password_reset';
		assertValidEmail(to);
		this.logger?.debug({ event: 'email.send.start', type }, 'Sending email');
		try {
			await this.transporter.sendMail({
				from: this.from,
				to,
				subject: 'Reset your password',
				html: `<p>Click the link below to reset your password:</p>
<p><a href="${url}">${url}</a></p>
<p>This link expires in 1 hour. If you did not request a password reset, ignore this email.</p>`,
			});
			this.logger?.info({ event: 'email.send.success', type }, 'Email sent');
		} catch (err) {
			const errorCode = (err as { code?: string }).code ?? 'SMTP_ERROR';
			this.logger?.warn(
				{ event: 'email.send.error', type, errorCode },
				'Email send failed',
			);
			throw err;
		}
	}

	async sendLoginAlertEmail(
		to: string,
		deviceName: string,
		ip: string,
		timestamp: Date,
		recoveryUrl: string,
	): Promise<void> {
		const type = 'login_alert';
		assertValidEmail(to);
		this.logger?.debug({ event: 'email.send.start', type }, 'Sending email');
		try {
			const time = timestamp.toUTCString();
			await this.transporter.sendMail({
				from: this.from,
				to,
				subject: 'New sign-in to your account',
				html: `<p>A new sign-in was detected on your account:</p>
<ul>
  <li><strong>Device:</strong> ${deviceName}</li>
  <li><strong>IP address:</strong> ${ip}</li>
  <li><strong>Time:</strong> ${time}</li>
</ul>
<p>If this was you, no action is needed.</p>
<p>If this wasn't you, click the link below to immediately lock your account and revoke all sessions:</p>
<p><a href="${recoveryUrl}">This wasn't me — secure my account</a></p>
<p>This recovery link expires in 24 hours.</p>`,
			});
			this.logger?.info({ event: 'email.send.success', type }, 'Email sent');
		} catch (err) {
			const errorCode = (err as { code?: string }).code ?? 'SMTP_ERROR';
			this.logger?.warn(
				{ event: 'email.send.error', type, errorCode },
				'Email send failed',
			);
			throw err;
		}
	}

	async sendEmailChangeVerificationEmail(
		to: string,
		verificationUrl: string,
	): Promise<void> {
		const type = 'email_change_verification';
		assertValidEmail(to);
		this.logger?.debug({ event: 'email.send.start', type }, 'Sending email');
		try {
			await this.transporter.sendMail({
				from: this.from,
				to,
				subject: 'Verify your new email address',
				html: `<p>You requested to change your account email address.</p>
<p>Click the link below to confirm this change:</p>
<p><a href="${verificationUrl}">${verificationUrl}</a></p>
<p>This link expires in 24 hours. If you did not request this change, you can ignore this email — your current email will remain unchanged.</p>`,
			});
			this.logger?.info({ event: 'email.send.success', type }, 'Email sent');
		} catch (err) {
			const errorCode = (err as { code?: string }).code ?? 'SMTP_ERROR';
			this.logger?.warn(
				{ event: 'email.send.error', type, errorCode },
				'Email send failed',
			);
			throw err;
		}
	}
}

// Singleton used by auth.ts hooks — runs outside the NestJS DI container.
export const smtpEmailService = new SmtpEmailAdapter();
