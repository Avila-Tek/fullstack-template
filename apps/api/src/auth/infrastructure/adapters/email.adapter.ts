import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { EmailPort } from '@/auth/application/ports/out/email.port.js';
import { EmailDeliveryFailedException } from '@/auth/domain/exceptions/email-delivery-failed.exception.js';
import { env } from '@/env.js';

@Injectable()
export class SmtpEmailAdapter extends EmailPort {
  private readonly transporter: Transporter;

  constructor(
    @InjectPinoLogger(SmtpEmailAdapter.name)
    private readonly logger: PinoLogger,
  ) {
    super();
    this.transporter = nodemailer.createTransport(
      env.EMAIL_SMTP_HOST
        ? {
            host: env.EMAIL_SMTP_HOST,
            port: env.EMAIL_SMTP_PORT,
            auth: env.EMAIL_SMTP_USER
              ? { user: env.EMAIL_SMTP_USER, pass: env.EMAIL_SMTP_PASS }
              : undefined,
          }
        : { jsonTransport: true }, // dev stub — logs to console, does not send
    );
  }

  async sendVerification(to: string, verificationUrl: string): Promise<void> {
    await this.send(to, 'Verify your email', `Click to verify: ${verificationUrl}`);
  }

  async sendPasswordReset(to: string, resetUrl: string): Promise<void> {
    await this.send(to, 'Reset your password', `Click to reset: ${resetUrl}`);
  }

  async send2faOtp(to: string, otp: string): Promise<void> {
    await this.send(to, 'Your 2FA code', `Your code: ${otp}`);
  }

  async sendLoginAlert(to: string, ip: string): Promise<void> {
    await this.send(to, 'New login detected', `Login from IP: ${ip}`);
  }

  async sendFailedLoginAlert(to: string, ip: string): Promise<void> {
    await this.send(to, 'Failed login attempt', `Failed login from IP: ${ip}`);
  }

  async sendSessionRevoked(to: string): Promise<void> {
    await this.send(to, 'Session revoked', 'Your session has been revoked.');
  }

  private async send(to: string, subject: string, text: string): Promise<void> {
    try {
      await this.transporter.sendMail({ from: env.EMAIL_FROM, to, subject, text });
    } catch (err) {
      this.logger.error({ err, to, subject }, 'Email delivery failed');
      throw new EmailDeliveryFailedException({ to, subject });
    }
  }
}
