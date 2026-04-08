import { describe, expect, it } from 'vitest';
import { JWT_JWKS_CONFIG } from '@/modules/identity/infrastructure/better-auth/auth-config';

describe('JWT_JWKS_CONFIG — ES256 key pair', () => {
	it('uses ES256 algorithm', () => {
		expect(JWT_JWKS_CONFIG.keyPairConfig.alg).toBe('ES256');
	});

	it('does not include modulusLength', () => {
		expect(JWT_JWKS_CONFIG.keyPairConfig).not.toHaveProperty('modulusLength');
	});

	it('sets rotation interval to 30 days (2592000 s)', () => {
		expect(JWT_JWKS_CONFIG.rotationInterval).toBe(2592000);
	});

	it('sets grace period to 7 days (604800 s)', () => {
		expect(JWT_JWKS_CONFIG.gracePeriod).toBe(604800);
	});
});
