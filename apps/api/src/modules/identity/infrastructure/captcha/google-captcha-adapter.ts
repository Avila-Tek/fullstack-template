import type {
	CaptchaServicePort,
	CaptchaVerifyResult,
} from '../../application/ports/out/captcha-service.port';

const SITEVERIFY_URL = 'https://www.google.com/recaptcha/api/siteverify';
const V3_SCORE_THRESHOLD = 0.5;

interface GoogleSiteverifyResponse {
	success: boolean;
	score?: number;
}

export class GoogleCaptchaAdapter implements CaptchaServicePort {
	async verify(
		token: string,
		version: 'v3' | 'v2',
	): Promise<CaptchaVerifyResult> {
		if (process.env.SKIP_CAPTCHA === 'true') {
			return { success: true };
		}

		const secret =
			version === 'v3'
				? (process.env.RECAPTCHA_V3_SECRET_KEY ?? '')
				: (process.env.RECAPTCHA_V2_SECRET_KEY ?? '');

		const url = `${SITEVERIFY_URL}?secret=${encodeURIComponent(secret)}&response=${encodeURIComponent(token)}`;

		let body: GoogleSiteverifyResponse;
		try {
			const response = await fetch(url, { method: 'POST' });
			body = (await response.json()) as GoogleSiteverifyResponse;
		} catch {
			// Fail open: Google is unreachable — log warning and allow the request through
			process.stderr.write(
				`${JSON.stringify({ event: 'captcha_api_unavailable', version })}\n`,
			);
			return { success: true };
		}

		if (!body.success) {
			return { success: false };
		}

		if (version === 'v3') {
			const score = body.score ?? 0;
			if (score < V3_SCORE_THRESHOLD) {
				return { success: false, challenge: 'v2' };
			}
			return { success: true, score };
		}

		// v2: Google confirmed checkbox success
		return { success: true };
	}
}

export const googleCaptchaService = new GoogleCaptchaAdapter();
