// Outbound port — decouples use cases from the email transport.
// Implement with SmtpEmailAdapter (or Resend, SES, etc.) in infrastructure/email/.

export abstract class EmailServicePort {
	abstract sendVerificationEmail(to: string, url: string): Promise<void>;
	abstract sendPasswordResetEmail(to: string, url: string): Promise<void>;
	abstract sendLoginAlertEmail(
		to: string,
		deviceName: string,
		ip: string,
		timestamp: Date,
		recoveryUrl: string,
	): Promise<void>;
	abstract sendEmailChangeVerificationEmail(
		to: string,
		verificationUrl: string,
	): Promise<void>;
}
