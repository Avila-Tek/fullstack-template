export abstract class SecurityNotificationPort {
  abstract sendNewLoginAlert(to: string, ip: string): Promise<void>;
  abstract sendPasswordChangedAlert(to: string): Promise<void>;
  abstract sendEmailChangedAlert(to: string, newEmail: string): Promise<void>;
}
