import {
	generateEmailChangeToken,
	validateEmailChangeToken,
} from '@/shared/utils/generate-email-change-token';
import { Injectable } from '@nestjs/common';
import type {
	EmailChangeTokenResult,
	TokenServicePort,
} from '../../application/ports/out/token-service.port';

@Injectable()
export class HmacTokenAdapter implements TokenServicePort {
	private get secret(): string {
		const s = process.env.BETTER_AUTH_SECRET;
		if (!s)
			throw new Error('BETTER_AUTH_SECRET is required for token operations');
		return s;
	}

	generateEmailChangeToken(userId: string, newEmail: string): string {
		return generateEmailChangeToken(userId, newEmail, this.secret);
	}

	validateEmailChangeToken(token: string): EmailChangeTokenResult {
		const result = validateEmailChangeToken(token, this.secret);
		return result.valid
			? { valid: true, userId: result.userId, newEmail: result.newEmail }
			: { valid: false };
	}
}
