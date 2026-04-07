import { describe, expect, it, vi } from 'vitest';
import {
	generateEmailChangeToken,
	validateEmailChangeToken,
} from './generate-email-change-token';

const SECRET = 'test-secret-key';

describe('generateEmailChangeToken / validateEmailChangeToken', () => {
	it('generates a valid token that validates successfully', () => {
		const token = generateEmailChangeToken('user-1', 'new@example.com', SECRET);
		const result = validateEmailChangeToken(token, SECRET);
		expect(result).toEqual({
			valid: true,
			userId: 'user-1',
			newEmail: 'new@example.com',
		});
	});

	it('rejects a token signed with a different secret', () => {
		const token = generateEmailChangeToken('user-1', 'new@example.com', SECRET);
		const result = validateEmailChangeToken(token, 'wrong-secret');
		expect(result.valid).toBe(false);
	});

	it('rejects a tampered token (flipped payload character)', () => {
		const token = generateEmailChangeToken('user-1', 'new@example.com', SECRET);
		// Flip first char of payload (before the dot) to corrupt the content
		const dotIdx = token.indexOf('.');
		const payload = token.slice(0, dotIdx);
		const sig = token.slice(dotIdx);
		const flipped = (payload.startsWith('A') ? 'B' : 'A') + payload.slice(1) + sig;
		const result = validateEmailChangeToken(flipped, SECRET);
		expect(result.valid).toBe(false);
	});

	it('rejects an expired token', () => {
		const realNow = Date.now;
		const pastTime = realNow() - 25 * 60 * 60 * 1000;
		vi.spyOn(Date, 'now').mockReturnValueOnce(pastTime);
		const token = generateEmailChangeToken('user-1', 'new@example.com', SECRET);
		vi.spyOn(Date, 'now').mockRestore();

		const result = validateEmailChangeToken(token, SECRET);
		expect(result.valid).toBe(false);
	});

	it('rejects token without dot separator', () => {
		const result = validateEmailChangeToken('nodot', SECRET);
		expect(result.valid).toBe(false);
	});
});
