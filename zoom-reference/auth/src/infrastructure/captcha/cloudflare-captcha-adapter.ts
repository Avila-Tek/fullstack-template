import { Inject, Injectable } from '@nestjs/common';
import { type IStructuredLogger, LOGGER_PORT } from '@zoom/utils';
import type {
	CaptchaServicePort,
	CaptchaVerifyResult,
} from '../../application/ports/out/captcha-service.port';
import { env } from '../../env';

const SITEVERIFY_URL =
	'https://challenges.cloudflare.com/turnstile/v0/siteverify';

interface TurnstileSiteverifyResponse {
	success: boolean;
	'error-codes'?: string[];
}

@Injectable()
export class CloudflareCaptchaAdapter implements CaptchaServicePort {
	constructor(
		@Inject(LOGGER_PORT)
		private readonly logger: IStructuredLogger,
	) {}

	// Cloudflare Turnstile is a single-challenge provider
	async verify(token: string): Promise<CaptchaVerifyResult> {
		if (env.SKIP_CAPTCHA) {
			return { success: true };
		}

		const secret = env.TURNSTILE_SECRET_KEY;

		const body = new URLSearchParams({ secret, response: token });

		let responseBody: TurnstileSiteverifyResponse;
		try {
			const response = await fetch(SITEVERIFY_URL, {
				method: 'POST',
				body,
			});
			responseBody = (await response.json()) as TurnstileSiteverifyResponse;
		} catch (err) {
			// Fail closed: Cloudflare is unreachable — block the request
			this.logger.warn(
				{ event: 'captcha_api_unavailable', error: String(err) },
				'Cloudflare Turnstile unreachable',
			);
			return { success: false, unavailable: true };
		}

		return { success: responseBody.success };
	}
}
