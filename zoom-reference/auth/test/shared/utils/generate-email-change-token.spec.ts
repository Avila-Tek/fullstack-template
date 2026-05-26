import { createHmac } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import {
	generateEmailChangeToken,
	validateEmailChangeToken,
} from '../../../src/shared/utils/generate-email-change-token';

const SECRET = 'test-secret-for-tests';
const USER_ID = 'user-123';
const NEW_EMAIL = 'new@example.com';

describe('generateEmailChangeToken', () => {
	it('returns a string in payload.sig format', () => {
		const token = generateEmailChangeToken(USER_ID, NEW_EMAIL, SECRET);
		expect(typeof token).toBe('string');
		expect(token).toContain('.');
	});

	it('embeds userId so validation can recover it', () => {
		const token = generateEmailChangeToken(USER_ID, NEW_EMAIL, SECRET);
		const result = validateEmailChangeToken(token, SECRET);
		expect(result.valid).toBe(true);
		if (result.valid) expect(result.userId).toBe(USER_ID);
	});

	it('embeds newEmail so validation can recover it', () => {
		const token = generateEmailChangeToken(USER_ID, NEW_EMAIL, SECRET);
		const result = validateEmailChangeToken(token, SECRET);
		expect(result.valid).toBe(true);
		if (result.valid) expect(result.newEmail).toBe(NEW_EMAIL);
	});

	it('handles email addresses with special characters', () => {
		const specialEmail = 'user+tag@sub.example.com';
		const token = generateEmailChangeToken(USER_ID, specialEmail, SECRET);
		const result = validateEmailChangeToken(token, SECRET);
		expect(result.valid).toBe(true);
		if (result.valid) expect(result.newEmail).toBe(specialEmail);
	});
});

describe('validateEmailChangeToken', () => {
	it('accepts a freshly generated token', () => {
		const token = generateEmailChangeToken(USER_ID, NEW_EMAIL, SECRET);
		const result = validateEmailChangeToken(token, SECRET);
		expect(result.valid).toBe(true);
	});

	it('rejects a token signed with a different secret', () => {
		const token = generateEmailChangeToken(USER_ID, NEW_EMAIL, SECRET);
		const result = validateEmailChangeToken(token, 'wrong-secret');
		expect(result.valid).toBe(false);
		if (!result.valid) expect(result.error).toContain('signature');
	});

	it('rejects a token with a tampered userId', () => {
		const token = generateEmailChangeToken(USER_ID, NEW_EMAIL, SECRET);
		const [payloadB64] = token.split('.');
		const parsed = JSON.parse(
			Buffer.from(payloadB64, 'base64url').toString('utf8'),
		);
		parsed.userId = 'evil-user';
		const tamperedPayload = Buffer.from(JSON.stringify(parsed)).toString(
			'base64url',
		);
		const tamperedToken = `${tamperedPayload}.${token.split('.')[1]}`;
		const result = validateEmailChangeToken(tamperedToken, SECRET);
		expect(result.valid).toBe(false);
	});

	it('rejects a token with a tampered newEmail', () => {
		const token = generateEmailChangeToken(USER_ID, NEW_EMAIL, SECRET);
		const [payloadB64] = token.split('.');
		const parsed = JSON.parse(
			Buffer.from(payloadB64, 'base64url').toString('utf8'),
		);
		parsed.newEmail = 'hacker@evil.com';
		const tamperedPayload = Buffer.from(JSON.stringify(parsed)).toString(
			'base64url',
		);
		const tamperedToken = `${tamperedPayload}.${token.split('.')[1]}`;
		const result = validateEmailChangeToken(tamperedToken, SECRET);
		expect(result.valid).toBe(false);
	});

	it('rejects a completely malformed token', () => {
		const result = validateEmailChangeToken('not-valid!!', SECRET);
		expect(result.valid).toBe(false);
	});

	it('rejects a token missing the signature part', () => {
		const result = validateEmailChangeToken('onlyonepartnoseparator', SECRET);
		expect(result.valid).toBe(false);
	});

	it('rejects an expired token (older than 24 hours)', () => {
		const oldTimestamp = Date.now() - 25 * 60 * 60 * 1000;
		const payload = Buffer.from(
			JSON.stringify({
				userId: USER_ID,
				newEmail: NEW_EMAIL,
				timestamp: oldTimestamp,
			}),
		).toString('base64url');
		const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
		const token = `${payload}.${sig}`;
		const result = validateEmailChangeToken(token, SECRET);
		expect(result.valid).toBe(false);
		if (!result.valid) expect(result.error).toContain('expired');
	});

	it('accepts a token that is exactly 24 hours minus one second old', () => {
		const almostExpired = Date.now() - (24 * 60 * 60 * 1000 - 1000);
		const payload = Buffer.from(
			JSON.stringify({
				userId: USER_ID,
				newEmail: NEW_EMAIL,
				timestamp: almostExpired,
			}),
		).toString('base64url');
		const sig = createHmac('sha256', SECRET).update(payload).digest('hex');
		const token = `${payload}.${sig}`;
		const result = validateEmailChangeToken(token, SECRET);
		expect(result.valid).toBe(true);
	});
});
