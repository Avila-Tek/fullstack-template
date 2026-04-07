export interface CaptchaVerifyResult {
	success: boolean;
	score?: number;
	challenge?: 'v2';
}

export abstract class CaptchaServicePort {
	abstract verify(
		token: string,
		version: 'v3' | 'v2',
	): Promise<CaptchaVerifyResult>;
}
