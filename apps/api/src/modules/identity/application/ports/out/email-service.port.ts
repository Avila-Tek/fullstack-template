export abstract class EmailServicePort {
	abstract sendVerificationEmail(to: string, url: string): Promise<void>;
	abstract sendPasswordResetEmail(to: string, url: string): Promise<void>;
	abstract sendEmailChangeVerificationEmail(
		to: string,
		verificationUrl: string,
	): Promise<void>;
}
