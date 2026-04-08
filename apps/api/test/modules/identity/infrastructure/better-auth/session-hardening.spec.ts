import { describe, expect, it } from 'vitest';
import {
	ADVANCED_CONFIG,
	SESSION_CONFIG,
} from '@/modules/identity/infrastructure/better-auth/auth-config';

describe('SESSION_CONFIG — hardened session settings', () => {
	it('sets updateAge to 1 hour (3600 s)', () => {
		expect(SESSION_CONFIG.updateAge).toBe(3600);
	});

	it('sets freshAge to 5 minutes (300 s)', () => {
		expect(SESSION_CONFIG.freshAge).toBe(300);
	});

	it('sets cookieCache.maxAge to 2 minutes (120 s)', () => {
		expect(SESSION_CONFIG.cookieCache.maxAge).toBe(120);
	});

	it('keeps expiresIn at 7 days (604800 s)', () => {
		expect(SESSION_CONFIG.expiresIn).toBe(604800);
	});
});

describe('ADVANCED_CONFIG — default cookie attributes', () => {
	it('sets sameSite to lax', () => {
		expect(ADVANCED_CONFIG.defaultCookieAttributes.sameSite).toBe('lax');
	});

	it('sets httpOnly to true', () => {
		expect(ADVANCED_CONFIG.defaultCookieAttributes.httpOnly).toBe(true);
	});

	it('sets path to /api/v1', () => {
		expect(ADVANCED_CONFIG.defaultCookieAttributes.path).toBe('/api/v1');
	});
});
