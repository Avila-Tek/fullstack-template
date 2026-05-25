// Outbound port — decouples use cases from the email transport.
// Implement with SmtpEmailAdapter (or Resend, SES, etc.) in infrastructure/.

export interface SendFailedLoginAlertEmailParams {
	twoFactorSuggested: boolean;
	twoFactorSettingsUrl: string;
	ipAddress: string;
	userAgent: string;
	timestamp: Date;
}

export abstract class EmailServicePort {
	abstract sendVerificationEmail(to: string, url: string): Promise<void>;
	abstract sendWelcomeEmail(to: string): Promise<void>;
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
	abstract sendSessionRevokedEmail(
		to: string,
		twoFactorForced: boolean,
	): Promise<void>;
	abstract sendTwoFactorOtpEmail(to: string, otp: string): Promise<void>;
	abstract sendFailedLoginAlertEmail(
		to: string,
		params: SendFailedLoginAlertEmailParams,
	): Promise<void>;
}
