export abstract class SmsServicePort {
	// Sends a 2FA OTP code via SMS during enrollment or sign-in challenge.
	abstract sendTwoFactorOtpSms(to: string, otp: string): Promise<void>;
	// Sends an OTP to verify a phone number before it can be used for SMS 2FA.
	abstract sendPhoneVerificationOtpSms(to: string, otp: string): Promise<void>;
}
