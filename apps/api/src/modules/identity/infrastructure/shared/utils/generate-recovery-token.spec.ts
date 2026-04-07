import { describe, expect, it, vi } from 'vitest';
import {
	generateRecoveryToken,
	validateRecoveryToken,
} from './generate-recovery-token';

const SECRET = 'test-secret-key';

describe('generateRecoveryToken / validateRecoveryToken', () => {
	it('generates a valid token that validates successfully', () => {
		const token = generateRecoveryToken('user-1', SECRET);
		const result = validateRecoveryToken(token, SECRET);
		expect(result).toEqual({ valid: true, userId: 'user-1' });
	});

	it('rejects a token signed with a different secret', () => {
		const token = generateRecoveryToken('user-1', SECRET);
		const result = validateRecoveryToken(token, 'wrong-secret');
		expect(result.valid).toBe(false);
	});

	it('rejects a tampered token (flipped character)', () => {
		const token = generateRecoveryToken('user-1', SECRET);
		// Flip the first character to produce a different base64url payload
		const flipped = token.startsWith('A') ? `B${token.slice(1)}` : `A${token.slice(1)}`;
		const result = validateRecoveryToken(flipped, SECRET);
		expect(result.valid).toBe(false);
	});

	it('rejects an expired token', () => {
		// Fake Date.now to return a time 25 hours ago
		const realNow = Date.now;
		const pastTime = realNow() - 25 * 60 * 60 * 1000;
		vi.spyOn(Date, 'now').mockReturnValueOnce(pastTime);
		const token = generateRecoveryToken('user-1', SECRET);
		vi.spyOn(Date, 'now').mockRestore();

		const result = validateRecoveryToken(token, SECRET);
		expect(result.valid).toBe(false);
	});

	it('rejects invalid base64 token', () => {
		const result = validateRecoveryToken('!!!not-base64!!!', SECRET);
		expect(result.valid).toBe(false);
	});
});
