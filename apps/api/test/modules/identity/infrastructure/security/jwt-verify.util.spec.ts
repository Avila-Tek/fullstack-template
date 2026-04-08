import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import type { IdentityJwtPayload } from '@/modules/identity/infrastructure/security/jwt-verify.util';
import { verifyIdentityJwt } from '@/modules/identity/infrastructure/security/jwt-verify.util';

const ISSUER = 'http://localhost:3002';
const AUDIENCE = 'http://localhost:4200';

async function makeJwks(alg: 'ES256' | 'RS256'): Promise<{
	sign: (payload: object, overrides?: { issuer?: string; audience?: string; expiresIn?: string }) => Promise<string>;
	jwks: ReturnType<typeof createLocalJWKSet>;
}> {
	const { privateKey, publicKey } = await generateKeyPair(alg);
	const jwkPublic = await exportJWK(publicKey);
	jwkPublic.alg = alg;
	jwkPublic.use = 'sig';
	const jwks = createLocalJWKSet({ keys: [jwkPublic] });

	const sign = async (
		payload: object,
		overrides: { issuer?: string; audience?: string; expiresIn?: string } = {},
	): Promise<string> => {
		return new SignJWT({ ...payload })
			.setProtectedHeader({ alg })
			.setIssuer(overrides.issuer ?? ISSUER)
			.setAudience(overrides.audience ?? AUDIENCE)
			.setIssuedAt()
			.setExpirationTime(overrides.expiresIn ?? '15m')
			.sign(privateKey);
	};

	return { sign, jwks };
}

describe('verifyIdentityJwt', () => {
	let es256: Awaited<ReturnType<typeof makeJwks>>;
	let rs256: Awaited<ReturnType<typeof makeJwks>>;

	beforeAll(async () => {
		[es256, rs256] = await Promise.all([makeJwks('ES256'), makeJwks('RS256')]);
	});

	it('accepts a valid ES256 token and returns the payload', async () => {
		const token = await es256.sign({
			email: 'user@example.com',
			emailVerified: true,
			sid: 'session-123',
			scope: '',
		});

		const payload = await verifyIdentityJwt(token, {
			jwks: es256.jwks,
			issuer: ISSUER,
			audience: AUDIENCE,
		});

		expect(payload.email).toBe('user@example.com');
		expect(payload.emailVerified).toBe(true);
		expect(payload.sid).toBe('session-123');
		expect(payload.scope).toBe('');
	});

	it('rejects an RS256 token (wrong algorithm)', async () => {
		const token = await rs256.sign({
			email: 'user@example.com',
			emailVerified: true,
			sid: 'session-123',
			scope: '',
		});

		await expect(
			verifyIdentityJwt(token, { jwks: rs256.jwks, issuer: ISSUER, audience: AUDIENCE }),
		).rejects.toThrow();
	});

	it('rejects an expired token', async () => {
		const token = await es256.sign(
			{ email: 'user@example.com', emailVerified: true, sid: 's1', scope: '' },
			{ expiresIn: '0s' },
		);

		await expect(
			verifyIdentityJwt(token, { jwks: es256.jwks, issuer: ISSUER, audience: AUDIENCE }),
		).rejects.toThrow();
	});

	it('rejects a token with wrong issuer', async () => {
		const token = await es256.sign(
			{ email: 'user@example.com', emailVerified: true, sid: 's1', scope: '' },
			{ issuer: 'https://evil.example.com' },
		);

		await expect(
			verifyIdentityJwt(token, { jwks: es256.jwks, issuer: ISSUER, audience: AUDIENCE }),
		).rejects.toThrow();
	});

	it('rejects a token with wrong audience', async () => {
		const token = await es256.sign(
			{ email: 'user@example.com', emailVerified: true, sid: 's1', scope: '' },
			{ audience: 'https://other.example.com' },
		);

		await expect(
			verifyIdentityJwt(token, { jwks: es256.jwks, issuer: ISSUER, audience: AUDIENCE }),
		).rejects.toThrow();
	});

	it('returns a typed IdentityJwtPayload', async () => {
		const token = await es256.sign({
			email: 'typed@example.com',
			emailVerified: false,
			sid: 'sid-typed',
			scope: 'read',
		});

		const payload: IdentityJwtPayload = await verifyIdentityJwt(token, {
			jwks: es256.jwks,
			issuer: ISSUER,
			audience: AUDIENCE,
		});

		expect(payload).toMatchObject<IdentityJwtPayload>({
			email: 'typed@example.com',
			emailVerified: false,
			sid: 'sid-typed',
			scope: 'read',
		});
	});
});
