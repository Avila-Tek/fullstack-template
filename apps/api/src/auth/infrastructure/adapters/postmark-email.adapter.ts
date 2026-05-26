import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import * as postmark from 'postmark';
import { EmailPort } from '../../application/ports/out/email.port.js';
import { EmailDeliveryFailedException } from '../../domain/exceptions/email-delivery-failed.exception.js';
import { env } from '../../../env.js';

@Injectable()
export class PostmarkEmailAdapter extends EmailPort {
  private readonly client: postmark.ServerClient;

  constructor(
    @InjectPinoLogger(PostmarkEmailAdapter.name)
    private readonly logger: PinoLogger,
  ) {
    super();
    this.client = new postmark.ServerClient(env.POSTMARK_API_KEY ?? '');
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
      await this.client.sendEmail({
        From: env.EMAIL_FROM,
        To: to,
        Subject: subject,
        TextBody: text,
      });
    } catch (err) {
      // Schema standard: never log PII — 'to' is an email address, 'subject' may contain context
      this.logger.error({ err, errorCode: 'EMAIL_DELIVERY_FAILED' }, 'Postmark delivery failed');
      throw new EmailDeliveryFailedException({ to, subject });
    }
  }
}
