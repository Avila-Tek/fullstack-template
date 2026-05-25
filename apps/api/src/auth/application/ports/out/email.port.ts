export abstract class EmailPort {
  abstract sendVerification(to: string, verificationUrl: string): Promise<void>;
  abstract sendPasswordReset(to: string, resetUrl: string): Promise<void>;
  abstract send2faOtp(to: string, otp: string): Promise<void>;
  abstract sendLoginAlert(to: string, ip: string): Promise<void>;
  abstract sendFailedLoginAlert(to: string, ip: string): Promise<void>;
  abstract sendSessionRevoked(to: string): Promise<void>;
}
