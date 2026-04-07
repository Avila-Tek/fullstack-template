import { Injectable } from '@nestjs/common';
import type {
	EmailChangeTokenResult,
	RecoveryTokenResult,
	TokenServicePort,
} from '../../application/ports/out/token-service.port';
import {
	generateEmailChangeToken,
	validateEmailChangeToken,
} from '../shared/utils/generate-email-change-token';
import {
	generateRecoveryToken,
	validateRecoveryToken,
} from '../shared/utils/generate-recovery-token';

@Injectable()
export class HmacTokenAdapter implements TokenServicePort {
	private get secret(): string {
		return process.env.BETTER_AUTH_SECRET ?? '';
	}

	generateRecoveryToken(userId: string): string {
		return generateRecoveryToken(userId, this.secret);
	}

	validateRecoveryToken(token: string): RecoveryTokenResult {
		const result = validateRecoveryToken(token, this.secret);
		return result.valid
			? { valid: true, userId: result.userId }
			: { valid: false };
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
