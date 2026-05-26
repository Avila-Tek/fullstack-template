import { Injectable } from '@nestjs/common';
import { SecurityNotificationPort } from '../../application/ports/out/security-notification.port.js';
import { EmailPort } from '../../application/ports/out/email.port.js';

@Injectable()
export class SecurityNotificationAdapter extends SecurityNotificationPort {
  constructor(private readonly emailPort: EmailPort) {
    super();
  }

  async sendNewLoginAlert(to: string, ip: string): Promise<void> {
    await this.emailPort.sendLoginAlert(to, ip);
  }

  async sendPasswordChangedAlert(to: string): Promise<void> {
    // Placeholder: delegates to send2faOtp — replace with dedicated email in F4
    await this.emailPort.send2faOtp(to, '');
  }

  async sendEmailChangedAlert(to: string, newEmail: string): Promise<void> {
    // Placeholder: delegates to sendLoginAlert — replace with dedicated email in F4
    await this.emailPort.sendLoginAlert(to, newEmail);
  }
}
