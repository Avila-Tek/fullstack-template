import { createHmac } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { ApiKeyHashPort } from '../../application/ports/out/api-key-hash.port';
import { env } from '../../env';

/**
 * HMAC-SHA256 keyed hash for API keys.
 *
 * SHA-256 without a key is keyless — attackable offline at billions/sec.
 * HMAC binds the hash to a server-side secret so a stolen DB alone is not
 * sufficient to brute-force the raw keys.
 *
 * Required env: API_KEY_HMAC_SECRET (validated at bootstrap in main.ts).
 */
@Injectable()
export class HmacApiKeyHashAdapter implements ApiKeyHashPort {
	hash(rawKey: string): string {
		return createHmac('sha256', env.API_KEY_HMAC_SECRET)
			.update(rawKey)
			.digest('hex');
	}
}
