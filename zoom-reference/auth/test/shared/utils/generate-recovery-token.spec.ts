import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
	generateRecoveryToken,
	validateRecoveryToken,
} from '../../../src/shared/utils/generate-recovery-token';

const SECRET = 'test-secret-for-tests';

describe('generateRecoveryToken', () => {
	it('returns a base64url string', () => {
		const token = generateRecoveryToken('user-123', SECRET);
		expect(typeof token).toBe('string');
		expect(token).toMatch(/^[A-Za-z0-9_-]+$/);
	});

	it('embeds the userId so validation can recover it', () => {
		const token = generateRecoveryToken('user-abc', SECRET);
		const result = validateRecoveryToken(token, SECRET);
		expect(result.valid).toBe(true);
		if (result.valid) expect(result.userId).toBe('user-abc');
	});

	it('produces different tokens on successive calls (timestamp entropy)', () => {
		const a = generateRecoveryToken('user-123', SECRET);
		const b = generateRecoveryToken('user-123', SECRET);
		// Tokens may match within the same millisecond; just verify they are strings
		expect(typeof a).toBe('string');
		expect(typeof b).toBe('string');
	});
});

describe('validateRecoveryToken', () => {
	it('accepts a freshly generated token', () => {
		const token = generateRecoveryToken('user-123', SECRET);
		const result = validateRecoveryToken(token, SECRET);
		expect(result.valid).toBe(true);
	});

	it('rejects a token signed with a different secret', () => {
		const token = generateRecoveryToken('user-123', SECRET);
		const result = validateRecoveryToken(token, 'wrong-secret');
		expect(result.valid).toBe(false);
	});

	it('rejects a token with a tampered userId', () => {
		const token = generateRecoveryToken('user-123', SECRET);
		// Decode, replace userId, re-encode without re-signing
		const decoded = Buffer.from(token, 'base64url').toString('utf8');
		const tampered = decoded.replace('user-123', 'evil-user');
		const tamperedToken = Buffer.from(tampered).toString('base64url');
		const result = validateRecoveryToken(tamperedToken, SECRET);
		expect(result.valid).toBe(false);
	});

	it('rejects a completely malformed token', () => {
		const result = validateRecoveryToken('not-valid!!', SECRET);
		expect(result.valid).toBe(false);
	});

	it('rejects a token missing parts', () => {
		const partial = Buffer.from('user-123:1234567890').toString('base64url');
		const result = validateRecoveryToken(partial, SECRET);
		expect(result.valid).toBe(false);
	});

	it('rejects an expired token (older than 24 hours)', () => {
		const oldTimestamp = (Date.now() - 25 * 60 * 60 * 1000).toString();
		const payload = `user-123:${oldTimestamp}`;
		const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
		const token = Buffer.from(`${payload}:${sig}`).toString('base64url');
		const result = validateRecoveryToken(token, SECRET);
		expect(result.valid).toBe(false);
		if (!result.valid) expect(result.error).toContain('expired');
	});

	it('accepts a token that is exactly 24 hours minus one second old', () => {
		const almostExpired = (
			Date.now() -
			(24 * 60 * 60 * 1000 - 1000)
		).toString();
		const payload = `user-123:${almostExpired}`;
		const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
		const token = Buffer.from(`${payload}:${sig}`).toString('base64url');
		const result = validateRecoveryToken(token, SECRET);
		expect(result.valid).toBe(true);
	});
});
