import { Injectable } from '@nestjs/common';
import { ZoomAuthClient } from '@zoom/providers';
import { env } from '../../../env';

export { ZoomAuthException } from '@zoom/providers';

/**
 * NestJS-injectable wrapper around ZoomAuthClient for email module.
 * Configures the client from env at construction time.
 */
@Injectable()
export class ZoomAuthService {
	readonly client: ZoomAuthClient;

	constructor() {
		this.client = new ZoomAuthClient({
			authUrl: env.ZOOM_AUTH_URL,
			user: env.ZOOM_USER,
			password: env.ZOOM_PASSWORD,
			timeoutMs: env.ZOOM_API_TIMEOUT_MS,
			retryMax: env.ZOOM_API_RETRY_MAX,
			retryBackoffMs: env.ZOOM_API_RETRY_BACKOFF_MS,
		});
	}

	getToken(): Promise<string> {
		return this.client.getToken();
	}

	invalidateToken(): void {
		this.client.invalidateToken();
	}
}
